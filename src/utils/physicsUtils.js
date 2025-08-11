import Matter from 'matter-js';

/**
 * Calculate canvas size based on current viewport and whether the categories panel is open.
 */
export function computeCanvasSize({ isMobile, categoriesPanelEnabled }) {
    const sidebarWidth = !isMobile && categoriesPanelEnabled ? 320 : 0;
    return {
        width: window.innerWidth - sidebarWidth,
        height: window.innerHeight,
    };
}

/**
 * Create world boundary bodies for the given canvas dimensions.
 */
export function createWorldBounds(width, height) {
    const { Bodies } = Matter;
    return [
        Bodies.rectangle(width / 2, -25, width, 50, {
            isStatic: true,
            render: { fillStyle: 'transparent' },
        }),
        Bodies.rectangle(width / 2, height + 25, width, 50, {
            isStatic: true,
            render: { fillStyle: 'transparent' },
        }),
        Bodies.rectangle(-25, height / 2, 50, height, {
            isStatic: true,
            render: { fillStyle: 'transparent' },
        }),
        Bodies.rectangle(width + 25, height / 2, 50, height, {
            isStatic: true,
            render: { fillStyle: 'transparent' },
        }),
    ];
}

/**
 * Update renderer size, recreate world bounds, and clamp bodies within bounds.
 */
export function updateRenderAndBounds({
    engine,
    render,
    wallsRef,
    newSize,
}) {
    if (!engine || !render) return;

    // Update renderer dimensions
    render.canvas.width = newSize.width;
    render.canvas.height = newSize.height;
    render.options.width = newSize.width;
    render.options.height = newSize.height;

    // Remove old boundaries
    if (wallsRef.current && wallsRef.current.length > 0) {
        Matter.World.remove(engine.world, wallsRef.current);
    }

    // Create and add new boundaries
    const newWalls = createWorldBounds(newSize.width, newSize.height);
    wallsRef.current = newWalls;
    Matter.World.add(engine.world, newWalls);

    // Clamp and reset velocity for out-of-bounds bodies
    const allBodies = engine.world.bodies.filter((body) => body.label === 'Circle Body');
    allBodies.forEach((body) => {
        const radius = body.circleRadius;
        let corrected = false;

        if (body.position.x - radius < 0) {
            Matter.Body.setPosition(body, { x: radius, y: body.position.y });
            corrected = true;
        } else if (body.position.x + radius > newSize.width) {
            Matter.Body.setPosition(body, { x: newSize.width - radius, y: body.position.y });
            corrected = true;
        }

        if (body.position.y - radius < 0) {
            Matter.Body.setPosition(body, { x: body.position.x, y: radius });
            corrected = true;
        } else if (body.position.y + radius > newSize.height) {
            Matter.Body.setPosition(body, { x: body.position.x, y: newSize.height - radius });
            corrected = true;
        }

        if (corrected) {
            Matter.Body.setVelocity(body, { x: 0, y: 0 });
        }
    });
}


