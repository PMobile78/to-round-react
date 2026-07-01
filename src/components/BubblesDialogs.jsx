import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme, useMediaQuery } from '@mui/material';
import BubbleDialog from './BubbleDialog';
import TagEditorDialog from './TagEditorDialog';
import MainMenuDrawer from './MainMenuDrawer';
import AboutDialog from './AboutDialog';
import TaskFilterDrawer from './TaskFilterDrawer';
import TasksCategoriesDialog from './TasksCategoriesDialog';
import FontSettingsDialog from './FontSettingsDialog';
import AppearanceDialog from './AppearanceDialog';
import ChangePasswordDialog from './ChangePasswordDialog';
import LogoutConfirmDialog from './LogoutConfirmDialog';
import TaskListDrawer from './ListViewDrawer';
import { isOverdue } from '../utils/notifications';
import { saveTagsToFirestore } from '../services/firestoreService';
import { useBubblesStore } from '../state/BubblesStore';
import { COLOR_PALETTE } from '../hooks/tagColors';

/**
 * Presentational container for all of BubblesPage's dialogs and drawers.
 *
 * Extracted from BubblesPage.jsx (Task A of #64): ~13 dialogs/drawers were pure
 * props wiring at the bottom of the page's JSX. This component holds no business
 * logic — every handler/state value is supplied by BubblesPage. The two
 * BubbleDialog helpers that carry logic (onStopPulsing / showStopPulsing)
 * stay in BubblesPage and arrive here as plain props.
 */
const BubblesDialogs = ({
    // Edit bubble dialog
    editDialog,
    handleCloseDialog,
    selectedBubble,
    setSelectedBubble,
    setEditDialog,
    handleDeleteNotification,
    handleDeleteBubble,
    handleMarkAsDone,
    handleSaveBubble,
    onStopPulsing,
    showStopPulsing,
    handleSetEditRecurrence,
    useRichTextEdit,
    handleToggleEditUseRichText,
    // Tag actions (used by the categories dialog)
    handleOpenTagDialog,
    handleDeleteTag,
    // Tag editor dialog
    handleCloseTagDialog,
    handleSaveTag,
    // Main menu drawer
    handleToggleBubbleBackground,
    handleToggleMainView,
    categoriesPanelEnabled,
    handleToggleCategoriesPanel,
    handleLogout,
    handleExportJson,
    handleImportJson,
    // Create bubble dialog
    createDialog,
    setCreateDialog,
    handleSetCreateRecurrence,
    handleDeleteCreateNotification,
    createNewBubble,
    useRichTextCreate,
    setUseRichTextCreate,
    // Categories dialog
    handleUndoDeleteTag,
    // Font settings dialog
    handleFontSizeChange,
    // Logout confirm dialog
    confirmLogout,
}) => {
    // Ambient context read directly from hooks (Stage G of 010d) instead of via
    // props from BubblesPage. themeMode is the resolved 'light'/'dark' from
    // theme.palette.mode — NOT useThemeMode(), which would spin up a 2nd instance
    // and desync from App's theme.
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const themeMode = theme.palette.mode;
    const getDialogPaperStyles = () => theme.custom?.dialogPaper || {
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
    };
    const {
        bubbles,
        setBubbles,
        tags,
        setTags,
        selectedTagId,
        setSelectedTagId,
        filterTags,
        showNoTag,
        isAllSelected,
        getBubbleCountByTagForBubblesView,
        registered,
        listFilter,
        setListFilter,
        listSearchQuery,
        setListSearchQuery,
        listSortBy,
        setListSortBy,
        listSortOrder,
        setListSortOrder,
        listFilterTags,
        setListFilterTags,
        listShowNoTag,
        setListShowNoTag,
        isAllListFiltersSelected,
        getBubbleCountByTagForListView,
        // Form state (create/edit dialogs) — read from the store (Stage E2 of 010d)
        // instead of via props; forwarded to BubbleDialog below unchanged. The
        // recurrence setters stay as the page-local handleSet*Recurrence props.
        dueDate,
        setDueDate,
        editDueDate,
        setEditDueDate,
        createNotifications,
        setCreateNotifications,
        editNotifications,
        setEditNotifications,
        createRecurrence,
        editRecurrence,
        notifDialogOpen,
        setNotifDialogOpen,
        notifValue,
        setNotifValue,
        bubbleSize,
        setBubbleSize,
        editBubbleSize,
        setEditBubbleSize,
        // Dialog open-flags + settings values — read from the store (Stage F of
        // 010d) instead of via forwarded props.
        menuDrawerOpen,
        setMenuDrawerOpen,
        filterDrawerOpen,
        setFilterDrawerOpen,
        fontSettingsDialog,
        setFontSettingsDialog,
        appearanceDialogOpen,
        setAppearanceDialogOpen,
        changePasswordOpen,
        setChangePasswordOpen,
        logoutDialog,
        setLogoutDialog,
        listViewDialog,
        setListViewDialog,
        aboutOpen,
        setAboutOpen,
        fontSize,
        bubbleBackgroundEnabled,
        mainView,
        // Tag-editor + categories dialog state — read from the store (Stage H of 010d).
        tagDialog,
        tagName,
        setTagName,
        tagColor,
        setTagColor,
        editingTag,
        deletingTags,
        categoriesDialog,
        setCategoriesDialog,
        isColorAvailable,
        canCreateMoreTags,
        getBubbleCountByTag,
        // Theme/design controls — read from the store (Stage F2 of 010d).
        themeModeState,
        setThemeMode,
        design,
        setDesign,
        designs,
        toggleTheme,
        themeToggleProps,
        onOpenMindMap,
    } = useBubblesStore();
    return (
        <>
            {/* Диалог редактирования */}
            <BubbleDialog
                mode="edit"
                open={editDialog}
                onClose={handleCloseDialog}
                t={t}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                themeMode={themeMode}
                getDialogPaperStyles={getDialogPaperStyles}
                initialTitle={selectedBubble?.title || ''}
                initialDescription={selectedBubble?.description || ''}
                editDueDate={editDueDate}
                setEditDueDate={setEditDueDate}
                isOverdue={isOverdue}
                notifDialogOpen={notifDialogOpen}
                setNotifDialogOpen={setNotifDialogOpen}
                notifValue={notifValue}
                setNotifValue={setNotifValue}
                editNotifications={editNotifications}
                setEditNotifications={setEditNotifications}
                handleDeleteNotification={handleDeleteNotification}
                tags={tags}
                selectedTagId={selectedTagId}
                setSelectedTagId={setSelectedTagId}
                editBubbleSize={editBubbleSize}
                setEditBubbleSize={setEditBubbleSize}
                handleDeleteBubble={handleDeleteBubble}
                handleMarkAsDone={handleMarkAsDone}
                handleSaveBubble={handleSaveBubble}
                onStopPulsing={onStopPulsing}
                showStopPulsing={showStopPulsing}
                editRecurrence={editRecurrence}
                setEditRecurrence={handleSetEditRecurrence}
                useRichText={useRichTextEdit}
                onToggleUseRichText={handleToggleEditUseRichText}
            />
            {/* Диалог создания/редактирования тега */}
            <TagEditorDialog
                open={tagDialog}
                onClose={handleCloseTagDialog}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                colorPalette={COLOR_PALETTE}
                editingTag={editingTag}
                tagName={tagName}
                setTagName={setTagName}
                tagColor={tagColor}
                setTagColor={setTagColor}
                isColorAvailable={isColorAvailable}
                canCreateMoreTags={canCreateMoreTags}
                onSave={handleSaveTag}
            />

            {/* Левое главное меню */}
            <MainMenuDrawer
                open={menuDrawerOpen}
                onClose={() => setMenuDrawerOpen(false)}
                isMobile={isMobile}
                themeMode={themeMode}
                themeToggleProps={themeToggleProps}
                toggleTheme={toggleTheme}
                bubbleBackgroundEnabled={bubbleBackgroundEnabled}
                onToggleBubbleBackground={handleToggleBubbleBackground}
                mainView={mainView}
                onToggleMainView={handleToggleMainView}
                categoriesPanelEnabled={categoriesPanelEnabled}
                onToggleCategoriesPanel={handleToggleCategoriesPanel}
                onOpenCategoriesDialog={() => setCategoriesDialog(true)}
                onOpenFontSettingsDialog={() => setFontSettingsDialog(true)}
                onOpenAppearanceDialog={() => setAppearanceDialogOpen(true)}
                onOpenChangePasswordDialog={() => setChangePasswordOpen(true)}
                onOpenMindMap={onOpenMindMap}
                onAbout={() => setAboutOpen(true)}
                onLogout={handleLogout}
                onExportJson={handleExportJson}
                onImportJson={handleImportJson}
            />

            <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} t={t} />

            {/* Боковое меню фильтрации (вынесено в компонент) */}
            <TaskFilterDrawer
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                isMobile={isMobile}
                themeMode={themeMode}
                tags={tags}
                filterTags={filterTags}
                showNoTag={showNoTag}
                onToggleNoTag={registered.handleNoTagFilterChange}
                onToggleTag={registered.handleTagFilterChange}
                onSelectAll={registered.selectAllFilters}
                onClearAll={registered.clearAllFilters}
                isAllSelected={isAllSelected()}
                getBubbleCountByTagForBubblesView={getBubbleCountByTagForBubblesView}
            />

            {/* Диалог создания нового пузыря */}
            <BubbleDialog
                mode="create"
                open={createDialog}
                onClose={() => setCreateDialog(false)}
                t={t}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                themeMode={themeMode}
                getDialogPaperStyles={getDialogPaperStyles}
                dueDate={dueDate}
                setDueDate={setDueDate}
                isOverdue={isOverdue}
                notifDialogOpen={notifDialogOpen}
                setNotifDialogOpen={setNotifDialogOpen}
                notifValue={notifValue}
                setNotifValue={setNotifValue}
                createNotifications={createNotifications}
                setCreateNotifications={setCreateNotifications}
                createRecurrence={createRecurrence}
                setCreateRecurrence={handleSetCreateRecurrence}
                handleDeleteCreateNotification={handleDeleteCreateNotification}
                tags={tags}
                selectedTagId={selectedTagId}
                setSelectedTagId={setSelectedTagId}
                bubbleSize={bubbleSize}
                setBubbleSize={setBubbleSize}
                onCreate={createNewBubble}
                useRichText={useRichTextCreate}
                onToggleUseRichText={setUseRichTextCreate}
            />
            {/* Диалог управления категориями задач - вынесен в отдельный компонент с поддержкой DnD */}
            <TasksCategoriesDialog
                open={categoriesDialog}
                onClose={() => setCategoriesDialog(false)}
                tags={tags}
                deletingTags={deletingTags}
                canCreateMoreTags={canCreateMoreTags}
                onAddTag={() => {
                    if (canCreateMoreTags()) {
                        handleOpenTagDialog();
                    }
                }}
                onEditTag={(tag) => {
                    handleOpenTagDialog(tag);
                }}
                onDeleteTag={(tagId) => handleDeleteTag(tagId)}
                onUndoDeleteTag={(tagId) => handleUndoDeleteTag(tagId)}
                getBubbleCountByTag={getBubbleCountByTag}
                themeMode={themeMode}
                isMobile={isMobile}
                isSmallScreen={isSmallScreen}
                getDialogPaperStyles={getDialogPaperStyles}
                onReorderTags={(updated) => {
                    setTags(updated);
                    saveTagsToFirestore(updated);
                }}
            />

            {/* Диалог настроек шрифта */}
            <FontSettingsDialog
                open={fontSettingsDialog}
                onClose={() => setFontSettingsDialog(false)}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                themeMode={themeMode}
                getDialogPaperStyles={getDialogPaperStyles}
                fontSize={fontSize}
                onFontSizeChange={handleFontSizeChange}
                onReset={() => handleFontSizeChange(8)}
            />

            {/* Диалог оформления */}
            <AppearanceDialog
                open={appearanceDialogOpen}
                onClose={() => setAppearanceDialogOpen(false)}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                themeMode={themeModeState}
                setThemeMode={setThemeMode}
                design={design}
                setDesign={setDesign}
                designs={designs}
                getDialogPaperStyles={getDialogPaperStyles}
            />

            {/* Диалог смены пароля */}
            <ChangePasswordDialog
                open={changePasswordOpen}
                onClose={() => setChangePasswordOpen(false)}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                getDialogPaperStyles={getDialogPaperStyles}
            />

            {/* Диалог подтверждения выхода */}
            <LogoutConfirmDialog
                open={logoutDialog}
                onClose={() => setLogoutDialog(false)}
                isMobile={isMobile}
                getDialogPaperStyles={getDialogPaperStyles}
                onConfirm={confirmLogout}
            />

            {/* Боковая панель списка задач */}
            <TaskListDrawer
                open={listViewDialog}
                onClose={() => setListViewDialog(false)}
                isMobile={isMobile}
                themeMode={themeMode}
                bubbles={bubbles}
                setBubbles={setBubbles}
                tags={tags}
                listFilter={listFilter}
                setListFilter={setListFilter}
                listSortBy={listSortBy}
                setListSortBy={setListSortBy}
                listSortOrder={listSortOrder}
                setListSortOrder={setListSortOrder}
                listFilterTags={listFilterTags}
                setListFilterTags={setListFilterTags}
                listShowNoTag={listShowNoTag}
                setListShowNoTag={setListShowNoTag}
                listSearchQuery={listSearchQuery}
                setListSearchQuery={setListSearchQuery}
                setSelectedBubble={setSelectedBubble}
                setSelectedTagId={setSelectedTagId}
                setEditDialog={setEditDialog}
                handleListTagFilterChange={registered.handleListTagFilterChange}
                handleListNoTagFilterChange={registered.handleListNoTagFilterChange}
                clearAllListFilters={registered.clearAllListFilters}
                selectAllListFilters={registered.selectAllListFilters}
                getBubbleCountByTagForListView={getBubbleCountByTagForListView}
                isAllListFiltersSelected={isAllListFiltersSelected()}
                onOpenFilterMenu={() => setFilterDrawerOpen(true)}
            />
        </>
    );
};

export default BubblesDialogs;
