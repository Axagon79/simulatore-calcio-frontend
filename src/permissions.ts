// src/config/permissions.ts

export const PERMISSIONS = {
    SHOW_ENGINE_ROOM: true,
    ALLOWED_MODES: [4], // Array di numeri
    VISIBLE_ALGOS: [1, 5, 6], // Array di numeri
    CAN_SAVE_DB: false,
    CAN_DEBUG: false,
    CAN_FETCH_ODDS: false,
    MAX_CYCLES: 1000,
    ADMIN_KEY: "GodMode2025"
};

export const checkAdmin = (): boolean => {
    const params = new URLSearchParams(window.location.search);
    return params.get('admin') === PERMISSIONS.ADMIN_KEY;
};
