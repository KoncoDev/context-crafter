class GlobalAppState {
    // 1. Define reactive state
    isSidebarOpen = $state(false);

    // 2. Define actions (methods)
    // No more store.update(n => !n) boilerplate
    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
    }

    closeSidebar() {
        this.isSidebarOpen = false;
    }

    openSidebar() {
        this.isSidebarOpen = true;
    }
}

// 3. Export a singleton instance
export const appState = new GlobalAppState();