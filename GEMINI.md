# Salgstal 3.1 - Project Context for Gemini

This document provides a comprehensive guide to the **Salgstal 3.1** project for AI assistants and developers. It outlines the architecture, key files, data flow, and development conventions.

## 1. Project Overview

**Salgstal 3.1** is a local web-based dashboard application designed to track and visualize insurance sales data for advisors.

*   **Type:** Multi-Page Application (MPA) with a local PowerShell backend.
*   **Core Technologies:**
    *   **Frontend:** Vanilla JavaScript (ES6+), HTML5.
    *   **Styling:** Tailwind CSS (via CDN).
    *   **Visualization:** Chart.js (via CDN).
    *   **Backend/Server:** PowerShell (`start-server.ps1`) using `System.Net.HttpListener`.
*   **Data Persistence:** Local JSON files stored in the `data/` directory.
*   **No Build Step:** The project runs directly from source.

## 2. Running the Application

The application relies on a custom PowerShell script to serve files and handle data persistence (simulating a REST API).

### **Start Command**
Execute the following in the project root:
```powershell
.\start-server.ps1
```
*   **Port:** `8080` (default).
*   **Behavior:** Minimizes to the system tray and opens the default browser.
*   **Launcher:** `start-server-tray-launcher.vbs` is a wrapper to run the PowerShell script invisibly.

## 3. Architecture & File Structure

### **Root Directory**
*   `start-server.ps1`: The HTTP server. Handles static file serving and `/api/data` endpoints.
*   `project-overview.md`: High-level documentation of business logic and data models.
*   `index.html`: Simple redirect to `pages/dashboard.html`.

### **`pages/` (Views)**
Contains the HTML markup for each view.
*   `dashboard.html`: Main overview with charts and metrics.
*   `advisors.html`: Advisor-specific performance tracking.
*   `data.html`: Excel import and data conversion interface.

### **`js/` (Logic)**
Organized by scope:
*   **`shared/`**: Reusable modules.
    *   `data-loader.js`: Singleton responsible for fetching, caching, and managing app state.
    *   `utils.js`: Common helpers (formatting, date parsing).
    *   `navigation.js`: Handles menu highlights and navigation logic.
*   **`dashboard/`, `advisors/`, `data/`**: Page-specific logic files (e.g., `dashboard-page.js` handles chart rendering for the dashboard).

### **`data/` (Storage)**
*   `database.json`: The main data store (Sales, Goals, etc.). *Note: Created/Updated by the app.*
*   `advisors_auth_json_file.json`: Advisor credentials/metadata.
*   `sales_goals.js`: Hardcoded targets.

## 4. Data Flow

1.  **Loading:**
    *   The frontend (`data-loader.js`) requests data from `/api/data` (handled by `start-server.ps1`).
    *   The server reads `data/database.json` and returns it as JSON.
    *   If the server is offline, it may fall back to direct file access (depending on browser security), but the API method is preferred.

2.  **Saving:**
    *   Modifications (e.g., after Excel import) are sent via `POST` to `/api/save`.
    *   The PowerShell server writes the payload directly to `data/database.json`.

3.  **Excel Import (Data Page):**
    *   Uses `SheetJS` (in a Web Worker) to parse user-uploaded Excel files.
    *   Converts raw rows into the standard JSON schema.
    *   Merges with existing data and saves via the API.

## 5. Development Conventions

*   **Style:** Use Tailwind utility classes directly in HTML. Avoid custom CSS files unless necessary.
*   **JavaScript:**
    *   Use ES6+ features (arrow functions, `const`/`let`, modules where supported/configured).
    *   **Do not** introduce build tools (Webpack, Vite) unless explicitly requested. The project aims to remain "no-build".
    *   Keep logic separated: Page-specific code goes in its respective `js/` subfolder; universal code goes in `js/shared/`.
*   **Charts:** Use `Chart.js` configurations. Ensure canvas elements have appropriate containers for responsiveness.
*   **Server Changes:** If modifying `start-server.ps1`, ensure to restart the script to apply changes.

## 6. Key Entities

*   **Advisor ID:** Unique identifier (e.g., `flfa_lb`).
*   **Sales Data Fields:**
    *   `MASTER_POLICE_NAVN`: Product Name.
    *   `AARLIG_PRAEMIE`: Value.
    *   `SAGSBEHANDLER`: Advisor Name (mapped to ID via `utils.js`).
