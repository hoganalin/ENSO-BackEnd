# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite)
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
npm run deploy    # Deploy to GitHub Pages (gh-pages -d dist)
```

There is no test suite configured.

## Environment

The app requires a `.env` file with:
```
VITE_API_BASE=https://ec-course-api.hexschool.io/v2
VITE_API_PATH=<your-path>
```

Vite exposes these as `import.meta.env.VITE_API_BASE` and `import.meta.env.VITE_API_PATH`.

The production base path is `/vite-reacthomework-finalweek-backEnd/` (set in `vite.config.js`).

## Architecture

**Stack:** React 19 + Vite, React Router 7 (Hash router), Redux Toolkit, Axios, Bootstrap 5, React Hook Form, SweetAlert2.

### Routing (`src/router.jsx`)

Two layout subtrees:
- `/` → `FrontendLayout` — public storefront (products, cart, checkout). Front-end views under `src/views/front/` are currently stubs.
- `/admin` → `AdminLayout` wrapped in `ProtectedRoute` — admin dashboard

`ProtectedRoute` (`src/components/ProtectedRoute.jsx`) calls the HexSchool auth check endpoint on mount; redirects to `/login` on 401.

Admin routes: `/admin/product`, `/admin/order`, `/admin/inventory`.

### API Layer (`src/service/`)

`src/service/api.js` exports an Axios instance (`apiAuth`) with:
- **Request interceptor**: reads JWT from cookies (`myToken` key, falls back to `hexToken`)
- **Response interceptor**: redirects to `#/login` on 401, shows `window.alert` on 5xx

All admin API calls must use `apiAuth`, not raw `axios`. Raw `axios` has no auth token.

Service modules:
- `adminOrders.js` — `getAdminOrders`, `updateAdminOrder`, `deleteAdminOrder`, `deleteAllAdminOrders`
- `adminProducts.js` — `getAdminProducts`, `createAdminProduct`, `updateAdminProduct`, `deleteAdminProduct`, `uploadAdminImage`

### State Management

Redux store (`src/store/store.js`) has a single slice: `messageSlice` (`src/slices/messageSlice.js`).

Use `useMessage()` hook (not raw dispatch) to show toasts: `showSuccess(msg)` / `showError(msg)`. The thunk auto-clears after 3 seconds. `MessageToast` renders the current message from state.

### Admin Modules

**AdminProducts** (`src/views/admin/AdminProducts.jsx`)
- Lists products with search (name/category) + enabled/disabled filter
- Opens `ProductModal` for create / edit / delete via Bootstrap JS Modal (`useRef` → `new bootstrap.Modal(...)`)
- `INITIAL_TEMPLATE_DATA` includes custom fragrance fields (`scenes[]`, `top_smell`, `heart_smell`, `base_smell`, `feature`) and `inventory`

**AdminOrders** (`src/views/admin/AdminOrders.jsx`)
- Client-side search + paid/unpaid filter over the fetched page
- Order detail modal uses React Hook Form (`useForm`) to allow editing customer info and qty; `watch()` drives real-time total recalculation

**AdminInventory** (`src/views/admin/AdminInventory.jsx`)
- HexSchool API has no inventory endpoint; `inventory` is stored as a custom numeric field on each product and persisted via `updateAdminProduct`
- Adjustment history is stored in `localStorage` under key `enso_inventory_logs` (max 200 entries, newest-first). This log is display-only and never synced to the API.
- `LOW_STOCK_THRESHOLD = 10`; rows are tinted yellow (<10) or red (=0)

### ProductModal (`src/components/ProductModal.jsx`)

Uses controlled state (not React Hook Form). Handles create, edit, and delete in one component, switched by `modalType` prop (`'create' | 'edit' | 'delete'`). Image upload calls `uploadAdminImage` (multipart), which returns a URL that is set into `tempData.imageUrl`. `imagesUrl[]` auto-expands (max 5) as the last slot is filled.

### Key Components

- `Pagination` — controlled; receives `pagination` object and `onChangePage(page)` callback
- `FullPageLoading` — full-screen spinner overlay; render with `isLoading` boolean prop
- `useMessage` (`src/hooks/useMessage.js`) — wraps Redux dispatch for toast notifications

### Utilities

- `src/assets/utils/filter.js` — `currency(value)` formats numbers as NTD (e.g. `1,200`)
- `src/utils/validation.js` — shared React Hook Form validation rule objects
