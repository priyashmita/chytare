# Chytare — Project Context for Claude Code

## Stack
- Frontend: React (CRA + craco) → `frontend/src/` → deployed on Vercel (auto-deploy from GitHub main)
- Backend: FastAPI (single file) → `backend/server.py` → deployed on Railway (auto-deploy from GitHub main)
- Database: MongoDB Atlas
- Images: Cloudinary
- Email: Resend
- Auth: JWT stored in localStorage as `chytare_token`

## Key paths
- All admin pages: `frontend/src/pages/admin/`
- Public pages: `frontend/src/pages/`
- All routes + auth context: `frontend/src/App.js`
- Entire backend: `backend/server.py`
- Brand colours: #1B4D3E (green), #FFFFF0 (cream), #DACBA0 (gold)
- Fonts: Playfair Display (headings), Manrope (body)

## Deployment rules
- NEVER edit files in Vercel or Railway dashboards directly
- All changes go via GitHub commit to main branch
- Frontend env var: REACT_APP_BACKEND_URL (set in Vercel)
- Backend env vars: MONGODB_URL, JWT_SECRET, CLOUDINARY_*, RESEND_API_KEY (set in Railway)

## Architecture rules
- Admin API calls always include: `Authorization: Bearer ${localStorage.getItem("chytare_token")}`
- Public API never gets internal fields (cost_price, hsn_code, gst_rate, selling_price, sku, product_type, composition_pct, hide_price)
- display_edition=false means strip edition + edition_size from public API response (already implemented in strip_internal_fields)
- All MongoDB records use UUID string `id` field, NOT MongoDB _id
- Backend is one file — no splitting, no routers, all routes in server.py

## What's been built (as of March 2026)
- Full admin panel: products, suppliers, materials, production jobs, material allocations, orders, enquiries, inventory, users, roles, activity log
- Public website: homepage, product detail page, collections
- ExportImportBar component wired into all 6 list pages (suppliers, materials, product master, production jobs, enquiries, orders)
- 9 export endpoints — all accept active filter params
- Import endpoints for: suppliers, materials, products, production-jobs
- Inventory adjustment modal on product edit page
- display_edition bug fixed on both backend (strip_internal_fields) and frontend (ProductDetailPage.jsx)

## Known pending audit items
- AuditHistoryModal wired into Product Master, Production Jobs, Suppliers, Materials, Material Purchases
- Bulk actions on list pages (products: hide/show, enquiries: status, production jobs: cancel)
- pricing_mode / price_display_mode dual-field cleanup on products
- AdminExcelImport hub page can be simplified now that inline export exists on every page

## Working style
- Solo non-technical founder
- Always prefer surgical edits over full rewrites when possible
- When adding a new feature, check for broken/stale imports first
- Commit message format: short imperative, e.g. "Fix edition display on product page"
- Never add console.log statements to production code
- Never add comments that say "TODO" without also fixing the issue
