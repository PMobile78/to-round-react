import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { BUBBLE_STATUS } from '../services/firestoreService';
import { parseLocalDateTime } from '../utils/dateTime';
import { getActiveNotification, buildNotificationKey } from '../utils/notifications';
import { bubbleShouldPulse } from '../utils/rafGating';
import { applyBubbleFill } from '../utils/bubbleStyle';

// perf #78: while the Matter engine is idle the pulse loop does no per-frame work;
// instead it scans this often (ms) for a bubble newly crossing into "should pulse"
// (e.g. its due time passes) and wakes the engine so pulsing starts from idle too.
const IDLE_PULSE_CHECK_MS = 500;

/**
 * Notification + overdue-pulse state and the rAF pulse loop, extracted from
 * BubblesPage (Task 4/6 of #38).
 *
 * The pulse loop is tied to Matter bodies and to due/notification state, so it
 * is moved as a whole — pulsation and notification bookkeeping are deliberately
 * kept together (splitting them risks changing behaviour).
 *
 * Page-owned values the loop reads are passed in: `bubbles`, `tags`, `engineRef`,
 * `getBubbleFillStyle`, `selectedBubble`, `editDialog`, `t`, `i18nLanguage`.
 * Effect dependencies mirror the original (`[bubbles, tags, getBubbleFillStyle,
 * t, i18nLanguage]`); `selectedBubble`/`editDialog` are read from the closure
 * exactly as before (the loop re-subscribes every render via getBubbleFillStyle).
 *
 * The refs are returned because useMatterEngine and the edit dialog also use them.
 */
export function useBubbleNotifications({
    bubbles,
    tags,
    engineRef,
    getBubbleFillStyle,
    selectedBubble,
    editDialog,
    t,
    i18nLanguage
}) {
    const theme = useTheme();
    const overdueColor = alpha(theme.palette.error.main, 0.5);

    const [dueDate, setDueDate] = useState(null); // Для создания
    const [editDueDate, setEditDueDate] = useState(null); // Для редактирования

    // Refs for overdue/sticky pulse tracking
    const stickyPulseRef = useRef(new Set()); // keep pulsing after repeat-every reschedule
    const lastDueRef = useRef(new Map());
    const manuallyStoppedPulsingRef = useRef(new Set()); // задачи, которые пользователь остановил вручную

    // Edit dialog notification/recurrence state
    const [editNotifications, setEditNotifications] = useState([]); // для редактирования
    const [editRecurrence, setEditRecurrence] = useState(null);

    const notifiedBubblesRef = useRef(new Set());
    const notifiedBubbleNotificationsRef = useRef(new Set()); // bubbleId:idx

    // Состояния для диалога уведомлений
    const [notifDialogOpen, setNotifDialogOpen] = useState(false);
    const [notifValue, setNotifValue] = useState(null);

    const [createNotifications, setCreateNotifications] = useState([]); // для создания
    const [createRecurrence, setCreateRecurrence] = useState(null); // { every, unit }

    // Keep pulsing even if editor opened; stop only by explicit Stop button

    // --- Пульсация для просроченных задач и уведомлений ---
    useEffect(() => {
        if (!engineRef.current) return;

        let animationFrame;
        let pulsePhase = 0;
        let lastIdleCheck = 0; // perf #78: throttle the idle "did anything become due?" scan

        // Temporarily disabled local notifications to test FCM only
        // const showNotificationAndVibrate = (bubble) => {
        //     // if (navigator.vibrate) {
        //     //     navigator.vibrate([200, 100, 200]);
        //     // }
        //     if (typeof window !== 'undefined' && 'Notification' in window) {
        //         try {
        //             console.log('[NOTIFY] Notification.permission:', Notification.permission);
        //             if ('serviceWorker' in navigator) {
        //                 navigator.serviceWorker.getRegistrations().then(regs => {
        //                     console.log('[NOTIFY] ServiceWorker registrations:', regs);
        //                 });
        //             }
        //             const title = t('bubbles.overdueNotificationTitle');
        //             let body = '';
        //             if (bubble.title) {
        //                 body = t('bubbles.overdueNotificationBodyWithTitle', { title: bubble.title });
        //             } else {
        //                 body = t('bubbles.overdueNotificationBody');
        //             }
        //             if (Notification.permission === "granted") {
        //                 try {
        //                     if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        //                         console.log('[NOTIFY] Trying to show notification via ServiceWorker:', title, body);
        //                         navigator.serviceWorker.ready.then(function (registration) {
        //                             registration.showNotification(title, { body })
        //                                 .then(() => console.log('[NOTIFY] showNotification success'))
        //                                 .catch(e => console.error('[NOTIFY] showNotification error:', e));
        //                         }).catch(e => console.error('[NOTIFY] navigator.serviceWorker.ready error:', e));
        //                     } else {
        //                         console.warn('[NOTIFY] ServiceWorker not supported');
        //                     }
        //                 } catch (e) {
        //                     console.error('[NOTIFY] Exception in showNotification:', e);
        //                 }
        //             } else if (Notification.permission !== "denied") {
        //                 console.log('[NOTIFY] Requesting notification permission...');
        //                 Notification.requestPermission().then(permission => {
        //                     console.log('[NOTIFY] Permission result:', permission);
        //                     if (permission === "granted") {
        //                         try {
        //                             if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        //                                 console.log('[NOTIFY] Trying to show notification via ServiceWorker (after permission):', title, body);
        //                                 navigator.serviceWorker.ready.then(function (registration) {
        //                                     registration.showNotification(title, { body })
        //                                         .then(() => console.log('[NOTIFY] showNotification success'))
        //                                         .catch(e => console.error('[NOTIFY] showNotification error:', e));
        //                                 }).catch(e => console.error('[NOTIFY] navigator.serviceWorker.ready error:', e));
        //                             } else {
        //                                 console.warn('[NOTIFY] ServiceWorker not supported');
        //                             }
        //                         } catch (e) {
        //                             console.error('[NOTIFY] Exception in showNotification (after permission):', e);
        //                         }
        //                     }
        //                 }).catch(e => console.error('[NOTIFY] requestPermission error:', e));
        //             }
        //         } catch (e) {
        //             console.error('[NOTIFY] Outer catch:', e);
        //         }
        //     }
        // };

        const animate = () => {
            // perf #78: gate the per-frame O(N) pulse work on engine activity.
            // While the engine is asleep the bodies are frozen and nothing is
            // pulsing (an active pulse calls Body.scale every frame, which keeps
            // the engine awake). So skip the full loop and instead run only a
            // cheap, throttled scan for a bubble newly crossing into "should
            // pulse" (e.g. its due time just passed) and wake the engine — that
            // makes pulsing start even from a fully idle scene. While awake the
            // loop runs exactly as before.
            const engine = engineRef.current;
            if (engine?.isAwake?.() === false) {
                const ts = Date.now();
                if (ts - lastIdleCheck >= IDLE_PULSE_CHECK_MS) {
                    lastIdleCheck = ts;
                    const needWake = bubbles.some(bubble =>
                        bubble.body
                        && bubble.status === BUBBLE_STATUS.ACTIVE
                        && bubbleShouldPulse(bubble, ts, {
                            stickyIds: stickyPulseRef.current,
                            suppressedIds: manuallyStoppedPulsingRef.current
                        })
                    );
                    if (needWake) engine.requestWake();
                }
                animationFrame = requestAnimationFrame(animate);
                return;
            }

            const now = Date.now();
            pulsePhase += 0.12;
            bubbles.forEach(bubble => {
                if (!bubble.body || bubble.status !== BUBBLE_STATUS.ACTIVE || !bubble.dueDate) return;
                const parsedDue = parseLocalDateTime(bubble.dueDate);
                if (!parsedDue) return;
                const due = parsedDue.getTime();

                // Если открыт редактор этой бульбашки и включён Repeat — не мерцать
                if (editDialog && selectedBubble && selectedBubble.id === bubble.id && bubble.recurrence) {
                    if (Math.abs(bubble.body.circleRadius - bubble.radius) > 0.5) {
                        const scale = bubble.radius / bubble.body.circleRadius;
                        Matter.Body.scale(bubble.body, scale, scale);
                    }
                    const tagColor = bubble.tagId ? tags.find(t => t.id === bubble.tagId)?.color : null;
                    applyBubbleFill(bubble, { tagColor }, getBubbleFillStyle);
                    return;
                }
                // 0. Пользователь остановил пульсацию вручную — не мерцать,
                // пока не изменится/не перенесётся dueDate (флаг сбрасывается отдельно).
                if (bubble.overduePulseSuppressed || manuallyStoppedPulsingRef.current.has(bubble.id)) {
                    if (Math.abs(bubble.body.circleRadius - bubble.radius) > 0.5) {
                        const scale = bubble.radius / bubble.body.circleRadius;
                        Matter.Body.scale(bubble.body, scale, scale);
                    }
                    const tagColor = bubble.tagId ? tags.find(t => t.id === bubble.tagId)?.color : null;
                    applyBubbleFill(bubble, { tagColor }, getBubbleFillStyle);
                    return;
                }
                // 1. Найти ближайшее сработавшее уведомление, которое не удалено
                const activeNotif = getActiveNotification(bubble, now);
                const activeNotifIdx = activeNotif ? activeNotif.idx : null;
                const activeNotifTargetTime = activeNotif ? activeNotif.targetTime : null;
                // 2. Если есть активное уведомление — пульсируем только по нему
                if (activeNotifIdx !== null) {
                    const key = buildNotificationKey(bubble.id, activeNotifTargetTime);
                    if (!notifiedBubbleNotificationsRef.current.has(key)) {
                        // showNotificationAndVibrate(bubble); // disabled for FCM testing
                        notifiedBubbleNotificationsRef.current.add(key);
                    }
                    // Пульсация
                    const baseRadius = bubble.radius;
                    const pulse = 1 + 0.13 * Math.sin(pulsePhase + bubble.body.id % 10);
                    const newRadius = baseRadius * pulse;
                    const currentRadius = bubble.body.circleRadius;
                    const scale = newRadius / currentRadius;
                    if (Math.abs(scale - 1) > 0.01) {
                        Matter.Body.scale(bubble.body, scale, scale);
                    }
                    const pulseValue = Math.abs(Math.sin(pulsePhase + bubble.body.id % 10));
                    if (pulseValue > 0.7) {
                        applyBubbleFill(bubble, { overdueColor }, getBubbleFillStyle);
                    } else {
                        const tagColor = bubble.tagId ? tags.find(t => t.id === bubble.tagId)?.color : null;
                        applyBubbleFill(bubble, { tagColor }, getBubbleFillStyle);
                    }
                    return; // не пульсируем по dueDate, если есть активное уведомление
                }
                // 3. Если нет активных уведомлений, но dueDate просрочен — пульсация по dueDate
                const shouldPulseOverdue = now >= due || stickyPulseRef.current.has(bubble.id);
                if (shouldPulseOverdue || bubble.overdueSticky) {
                    if (!notifiedBubblesRef.current.has(bubble.id)) {
                        // showNotificationAndVibrate(bubble); // disabled for FCM testing
                        notifiedBubblesRef.current.add(bubble.id);
                    }
                    const baseRadius = bubble.radius;
                    const pulse = 1 + 0.13 * Math.sin(pulsePhase + bubble.body.id % 10);
                    const newRadius = baseRadius * pulse;
                    const currentRadius = bubble.body.circleRadius;
                    const scale = newRadius / currentRadius;
                    if (Math.abs(scale - 1) > 0.01) {
                        Matter.Body.scale(bubble.body, scale, scale);
                    }
                    const pulseValue = Math.abs(Math.sin(pulsePhase + bubble.body.id % 10));
                    if (pulseValue > 0.7) {
                        applyBubbleFill(bubble, { overdueColor }, getBubbleFillStyle);
                    } else {
                        const tagColor = bubble.tagId ? tags.find(t => t.id === bubble.tagId)?.color : null;
                        applyBubbleFill(bubble, { tagColor }, getBubbleFillStyle);
                    }
                } else if (bubble.body && Math.abs(bubble.body.circleRadius - bubble.radius) > 0.5) {
                    // Сбросить радиус, если не пульсируем
                    const scale = bubble.radius / bubble.body.circleRadius;
                    Matter.Body.scale(bubble.body, scale, scale);
                    const tagColor = bubble.tagId ? tags.find(t => t.id === bubble.tagId)?.color : null;
                    applyBubbleFill(bubble, { tagColor }, getBubbleFillStyle);
                }
            });
            animationFrame = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(animationFrame);
    }, [bubbles, tags, getBubbleFillStyle, t, i18nLanguage]);

    // Сброс уведомлений при смене языка
    useEffect(() => {
        notifiedBubblesRef.current = new Set();
    }, [i18nLanguage]);

    return {
        dueDate,
        setDueDate,
        editDueDate,
        setEditDueDate,
        editNotifications,
        setEditNotifications,
        editRecurrence,
        setEditRecurrence,
        createNotifications,
        setCreateNotifications,
        createRecurrence,
        setCreateRecurrence,
        notifDialogOpen,
        setNotifDialogOpen,
        notifValue,
        setNotifValue,
        stickyPulseRef,
        lastDueRef,
        manuallyStoppedPulsingRef,
        notifiedBubblesRef,
        notifiedBubbleNotificationsRef
    };
}
