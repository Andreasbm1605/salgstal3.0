# Salgstal 3.1 - Project Context for Claude

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
*   `start-server.ps1`: The HTTP server. Handles static file serving and API endpoints.
*   `project-overview.md`: High-level documentation of business logic and data models.
*   `index.html`: Simple redirect to `pages/dashboard.html`.

### **`pages/` (Views)**
Contains the HTML markup for each view.
*   `dashboard.html`: Main overview with charts and metrics.
*   `advisors.html`: Advisor-specific performance tracking.
*   `data.html`: Excel import and data conversion interface.
*   `tilbudsopfølgning.html`: Offer follow-up page.

### **`js/` (Logic)**
Organized by scope:
*   **`shared/`**: Reusable modules.
    *   `data-loader.js`: Singleton responsible for fetching, caching, and managing app state.
    *   `utils.js`: Common helpers (formatting, date parsing).
    *   `navigation.js`: Handles menu highlights and navigation logic.
    *   `user-loader.js`: Fetches and caches user information from `/api/user` endpoint.
*   **`dashboard/`, `advisors/`, `data/`**: Page-specific logic files (e.g., `dashboard-page.js` handles chart rendering for the dashboard).

### **`data/` (Storage)**
*   `database.json`: The main data store (Sales, Goals, etc.). *Note: Created/Updated by the app.*
*   `advisors_auth_json_file.json`: Advisor credentials/metadata with user mapping.
*   `advisors_access.json`: Access control list for the advisors page.
*   `data_access.json`: Access control list for the data import page.
*   `sales_goals.js`: Hardcoded targets.

### **`assets/` (Static Resources)**
*   `images/Profilbilleder/`: User profile pictures (named `USERNAME.jpg`, e.g., `ANMA.jpg`, `ADRB.jpg`).
*   `images/Profilbilleder/empty.png`: Fallback image for users without profile pictures.
*   `images/profilelb.png`: Legacy profile image (may be deprecated).

## 4. API Endpoints

The PowerShell server (`start-server.ps1`) provides the following endpoints:

### **GET /api/data**
Returns all sales data from `database.json`:
```json
{
  "converted": [...],
  "nonConverted": [...],
  "rejected": [...],
  "metadata": {...}
}
```

### **POST /api/save**
Saves data to `database.json`. Expects JSON body with sales data.

### **GET /api/user**
Returns current user information based on Windows username:
```json
{
  "username": "ANMA",
  "displayName": "Andreas B.",
  "profileImage": "Profilbilleder/ANMA.jpg"
}
```

## 5. Data Flow

1.  **Loading:**
    *   The frontend (`data-loader.js`) requests data from `/api/data` (handled by `start-server.ps1`).
    *   The server reads `data/database.json` and returns it as JSON.
    *   User information is fetched from `/api/user` via `user-loader.js`.

2.  **Saving:**
    *   Modifications (e.g., after Excel import) are sent via `POST` to `/api/save`.
    *   The PowerShell server writes the payload directly to `data/database.json`.

3.  **Excel Import (Data Page):**
    *   Uses `SheetJS` (in a Web Worker) to parse user-uploaded Excel files.
    *   Converts raw rows into the standard JSON schema.
    *   Merges with existing data and saves via the API.

4.  **User Detection:**
    *   Server detects Windows username via `$env:USERNAME` on startup.
    *   Looks up user in `advisors_auth_json_file.json` by matching `user` field.
    *   Returns display name and profile image path via `/api/user`.
    *   Frontend loads profile picture from `assets/images/Profilbilleder/`.

## 6. User Management System

### **Advisors JSON Structure** (`data/advisors_auth_json_file.json`)
Each advisor entry contains:
*   `id`: Unique identifier (e.g., `flfa_lb`, `anma`).
*   `name`: Display name (e.g., "Flemming F.", "Andreas B.").
*   `user`: Windows username in uppercase (e.g., "FLFA", "ANMA", "ANDRE").
*   `raadgiver`: Boolean flag - `true` shows in advisors dropdown, `false` hides from dropdown.

**Example:**
```json
{
  "id": "anma",
  "name": "Andreas B.",
  "user": "ANMA",
  "raadgiver": false
}
```

### **User Types**
*   **Advisors** (`raadgiver: true`): Appear in the advisors page dropdown and have their data tracked.
*   **Non-Advisor Users** (`raadgiver: false`): Can log in and see their name in the profile, but do not appear in advisors page (e.g., ANMA, TMAR, JMAD, ANDRE).

### **Profile Pictures**
*   Stored in: `assets/images/Profilbilleder/`
*   Naming: `USERNAME.jpg` (uppercase, e.g., `ANMA.jpg`, `ADRB.jpg`)
*   Fallback: `empty.png` if user's image is missing
*   Loaded dynamically via `user-loader.js` with automatic fallback handling

## 7. Access Control System

The application implements user-based access control for sensitive pages using Windows username authentication.

### **Access Control Files**

**Advisors Page Access** (`data/advisors_access.json`):
```json
{
  "allowed_users": [
    "JMAD",
    "ANMA",
    "andre"
  ],
  "access_description": "List of Windows usernames allowed to access the advisors page"
}
```

**Data Import Page Access** (`data/data_access.json`):
```json
{
  "allowed_users": [
    "andre",
    "ANMA",
    "JMAD"
  ],
  "access_description": "List of Windows usernames allowed to access the data import page"
}
```

### **Access Control Flow**

1.  **Automatic Authentication:** On page load, the page automatically detects the Windows username via `/api/user` endpoint
2.  **Access Check:** The username is compared against the `allowed_users` list in the respective access control file
3.  **Authorized Users:** See the full page functionality immediately (no password required)
4.  **Unauthorized Users:** See an access denied message with a link back to the dashboard

### **Access Control Implementation**

Each protected page follows this pattern:

**HTML Structure:**
*   Access denied section (initially hidden)
*   Main content wrapped in a container (initially hidden)

**JavaScript Logic:**
*   `loadAccessControl()`: Fetches the access control JSON file
*   `checkUserAccess()`: Verifies current user against allowed list
*   Shows appropriate UI based on access rights
*   Safe failure mode: Denies access if access control file is missing

### **Managing Access**

**To Grant Access:**
1.  Edit the respective access control file (`advisors_access.json` or `data_access.json`)
2.  Add the Windows username (case-sensitive) to the `allowed_users` array
3.  Save the file - changes take effect immediately (no server restart needed)
4.  User refreshes the page to gain access

**To Revoke Access:**
1.  Edit the respective access control file
2.  Remove the username from the `allowed_users` array
3.  Save the file
4.  User will see access denied on next page load

### **Security Considerations**

**Strengths:**
*   No passwords stored in JSON files
*   Automatic authentication based on Windows login
*   Centralized access control lists
*   Clear denial messages for unauthorized users
*   Per-page access control (advisors and data pages have separate access lists)

**Limitations:**
*   Client-side access check (can be bypassed with browser dev tools)
*   No server-side validation of access
*   Acceptable for local-only dashboard with trusted users

## 8. Development Conventions

*   **Style:** Use Tailwind utility classes directly in HTML. Avoid custom CSS files unless necessary.
*   **JavaScript:**
    *   Use ES6+ features (arrow functions, `const`/`let`, modules where supported/configured).
    *   **Do not** introduce build tools (Webpack, Vite) unless explicitly requested. The project aims to remain "no-build".
    *   Keep logic separated: Page-specific code goes in its respective `js/` subfolder; universal code goes in `js/shared/`.
*   **Charts:** Use `Chart.js` configurations. Ensure canvas elements have appropriate containers for responsiveness.
*   **Server Changes:** If modifying `start-server.ps1`, ensure to restart the script to apply changes.
*   **User Data:** Always modify `advisors_auth_json_file.json` to add/update users - never hardcode usernames in the server script.
*   **Access Control:** Modify `advisors_access.json` or `data_access.json` to manage page access - no server restart required.

## 9. Key Entities

*   **Advisor ID:** Unique identifier (e.g., `flfa_lb`, `anma`).
*   **Windows Username:** Used for login detection and access control (e.g., `ANMA`, `ADRB`, `ANDRE`, `andre`).
*   **Sales Data Fields:**
    *   `MASTER_POLICE_NAVN`: Product Name.
    *   `AARLIG_PRAEMIE`: Annual premium value.
    *   `SAGSBEHANDLER`: Advisor initials (mapped to ID via `utils.js`).
    *   `KONVERTERINGS_DATO`: Conversion date.
    *   `FORSIKRINGSTAGER_CVR`: Customer CVR number.

## 10. Testing the Application

1.  **Start the server:** `.\start-server.ps1`
2.  **Verify user detection:** Console should show "Detected user: [Name] ([USERNAME])"
3.  **Check API endpoints:**
    *   `http://localhost:8080/api/data` - Returns sales data
    *   `http://localhost:8080/api/user` - Returns current user info
4.  **Verify profile picture:** Bottom left corner should show username and profile image
5.  **Test advisors page access:**
    *   Only users in `advisors_access.json` should see the page content
    *   Other users should see "Access Denied" message
    *   Only users with `raadgiver: true` should appear in the advisor dropdown (if access granted)
6.  **Test data page access:**
    *   Only users in `data_access.json` should see the data import interface
    *   Other users should see "Access Denied" message

## 11. Common Tasks

### **Add a New User**
1.  Edit `data/advisors_auth_json_file.json`
2.  Add new entry with `id`, `name`, `user` (uppercase Windows username), and `raadgiver` (true/false)
3.  Add profile picture: `assets/images/Profilbilleder/USERNAME.jpg`
4.  Restart server

### **Update Display Name**
1.  Edit `data/advisors_auth_json_file.json`
2.  Update the `name` field for the user
3.  Restart server

### **Hide User from Advisors Page**
1.  Edit `data/advisors_auth_json_file.json`
2.  Set `raadgiver: false` for the user
3.  Restart server

### **Grant Access to Advisors Page**
1.  Edit `data/advisors_access.json`
2.  Add the Windows username to the `allowed_users` array
3.  Save file (no server restart needed)
4.  User refreshes the page to gain access

### **Grant Access to Data Import Page**
1.  Edit `data/data_access.json`
2.  Add the Windows username to the `allowed_users` array
3.  Save file (no server restart needed)
4.  User refreshes the page to gain access

### **Revoke Page Access**
1.  Edit the respective access control file (`advisors_access.json` or `data_access.json`)
2.  Remove the username from the `allowed_users` array
3.  Save file (no server restart needed)
4.  User will see "Access Denied" on next page load

## 12. Architecture Characteristics

*   **No Build Step:** Runs directly from source files
*   **Client-Heavy:** Most logic in JavaScript, server is minimal
*   **Local Only:** Runs on `localhost:8080`, meant for local use
*   **Single File DB:** Uses JSON file instead of SQL database
*   **Client-Side Access Control:** Page access checks happen in browser using Windows username
*   **Per-Page Access Lists:** Separate access control files for advisors and data pages
*   **CORS Enabled:** Allows cross-origin requests
*   **5-Minute Cache:** Data cached on client for 5 minutes

## 13. Important Notes

*   This is a **single-purpose local dashboard** for a specific business team
*   Prioritizes **simplicity over enterprise-grade architecture**
*   No external dependencies (all libraries loaded via CDN)
*   Profile pictures are **not** sent via API - only the relative path
*   User detection happens **once at server startup** - not per request
*   Unknown users show "Unknown User" in profile section
*   Access control is **client-side only** - acceptable for local trusted environment
*   Access control changes take effect **immediately** without server restart
*   Each page (advisors, data) has its own access control file for granular permissions
