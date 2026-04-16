# Sidebar and Topbar Alignment Fix

## Problem (Masalah)
"Sejajarkan garis horizontal pada sidebar dengan garis horizontal pada headbar sehingga penampilan akan semakin baik"

Translation: Align the horizontal line on the sidebar with the horizontal line on the header so the appearance will be better.

## Issue Identified
The horizontal border line (`border-b`) on the sidebar header and the topbar were not aligned because they had different vertical padding:
- **Sidebar header** (before): `p-6` (24px padding on all sides)
- **Topbar**: `py-4` (16px padding top and bottom)

This created a visual misalignment where the bottom border of the sidebar header appeared at a different height than the bottom border of the topbar.

## Solution
Changed the sidebar header padding from `p-6` to `px-6 py-4`:
- **Horizontal padding**: Kept at `px-6` (24px left and right) to maintain spacing
- **Vertical padding**: Changed to `py-4` (16px top and bottom) to match the topbar

Also adjusted the `mt-3` to `mt-2` for the "System Active" indicator to maintain proper spacing with the reduced vertical padding.

## Result
Now both components have the same vertical padding (`py-4`), ensuring their `border-b` lines are perfectly aligned horizontally at the same height from the top of the screen. This creates a cleaner, more professional appearance.

## Files Changed
- `frontend/components/sidebar.tsx` - Line 25, 38

## Visual Impact
✅ Sidebar header border aligns perfectly with topbar border
✅ Maintains proper spacing for all content
✅ Works in both expanded and collapsed sidebar states
✅ Responsive behavior preserved

## Technical Details
- Changed: `className="p-6 border-b ...` 
- To: `className="px-6 py-4 border-b ...`
- Adjusted: `mt-3` to `mt-2` for System Active indicator
