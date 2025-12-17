# 📐 Responsive Design Grid Reference

## 🎯 Breakpoint Visual Guide

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        RESPONSIVE BREAKPOINT CHART                              │
└─────────────────────────────────────────────────────────────────────────────────┘

0px ─────── 640px ─────── 768px ─────── 1024px ─────── 1280px ─────── 1536px
│           │             │             │              │              │
├─ Mobile ──┼─ Small ─────┼─ Tablet ────┼─ Desktop ────┼─ Large ──────┼─ Extra ─
│           │   Tablet    │             │   (lg)       │  Desktop     │  Large
│  (base)   │   (sm:)     │    (md:)    │              │   (xl:)      │  (2xl:)
│           │             │             │              │              │
│  2 cols   │  3 cols     │  4 cols     │  5 cols      │  6 cols      │  6+ cols
│  px-4     │  px-6       │  px-8       │  px-8        │  px-8        │  px-8
│  gap-2    │  gap-3      │  gap-4      │  gap-4       │  gap-4       │  gap-4
│           │             │             │              │              │
└───────────┴─────────────┴─────────────┴──────────────┴──────────────┴──────────
```

---

## 📊 Grid Column System

### Column Distribution

```
Mobile (320-639px)
┌─────────────────────┐
│  Card 1 │ Card 2    │  2 columns
├─────────────────────┤
│  Card 3 │ Card 4    │
├─────────────────────┤
│  Card 5 │ Card 6    │
└─────────────────────┘

Small Tablet (640-767px)
┌─────────────────────────┐
│  Card 1 │ Card 2 │ Card 3  │  3 columns
├─────────────────────────┤
│  Card 4 │ Card 5 │ Card 6  │
└─────────────────────────┘

Tablet (768-1023px)
┌──────────────────────────────────┐
│  C1 │ C2 │ C3 │ C4  │  4 columns │
├──────────────────────────────────┤
│  C5 │ C6 │ C7 │ C8  │
└──────────────────────────────────┘

Desktop (1024-1279px)
┌────────────────────────────────────────┐
│  C1 │ C2 │ C3 │ C4 │ C5  │  5 columns │
├────────────────────────────────────────┤
│  C6 │ C7 │ C8 │ C9 │ C10 │
└────────────────────────────────────────┘

Large Desktop (1280px+)
┌──────────────────────────────────────────────┐
│  C1 │ C2 │ C3 │ C4 │ C5 │ C6  │  6 columns │
├──────────────────────────────────────────────┤
│  C7 │ C8 │ C9 │ C10│ C11│ C12 │
└──────────────────────────────────────────────┘
```

---

## 📱 Device Examples

### iPhone Models
```
iPhone 11/12/13/14         iPhone 15/16
┌─────────────────┐        ┌─────────────────┐
│  390 × 844      │        │  393 × 852      │
│  2 columns      │        │  2 columns      │
│  px-4 (16px)    │        │  px-4 (16px)    │
│  gap-2 (8px)    │        │  gap-2 (8px)    │
│                 │        │                 │
│  Card: ~179px   │        │  Card: ~182px   │
└─────────────────┘        └─────────────────┘

iPhone 14 Pro (Notch)       iPhone 15 Pro (Dynamic Island)
┌─────────────────┐        ┌─────────────────┐
│  ∆ 393 × 852    │        │  ≣ 393 × 852    │
│  Safe area: 47  │        │  Safe area: 50  │
│  2 columns ✓    │        │  2 columns ✓    │
│  Respects notch │        │  Respects island│
└─────────────────┘        └─────────────────┘
```

### Android Models
```
Galaxy S21              Pixel 6
┌──────────────────┐   ┌──────────────────┐
│  360 × 800       │   │  412 × 915       │
│  2 columns       │   │  2-3 columns     │
│  px-4 (16px)     │   │  px-4 (16px)     │
│  gap-2 (8px)     │   │  gap-2 (8px)     │
│                  │   │                  │
│  Card: ~164px    │   │  Card: ~196px    │
└──────────────────┘   └──────────────────┘
```

### Tablets
```
iPad (9.7")                    iPad Pro (11")
┌───────────────────┐          ┌───────────────────────┐
│  810 × 1080       │          │  834 × 1194           │
│  3 columns        │          │  4 columns (or 3)     │
│  px-6 (24px)      │          │  px-6 (24px)          │
│  gap-3 (12px)     │          │  gap-3 (12px)         │
│  Hero: 16:9       │          │  Hero: 16:9           │
└───────────────────┘          └───────────────────────┘
```

---

## 📏 Sizing Reference

### Container Widths
```
Mobile (px-4):     Available = Device - 32px (16px × 2)
Tablet (px-6):     Available = Device - 48px (24px × 2)
Desktop (px-8):    Available = Device - 64px (32px × 2)
```

### Grid Gap Sizes
```
Mobile (gap-2):     8px
Tablet (gap-3):     12px
Desktop (gap-4):    16px
```

### Aspect Ratios
```
Hero Section:
┌─ Mobile: aspect-square (1:1)
│  ┌──────┐
│  │      │  Square fills mobile screen
│  │      │
│  │      │
│  └──────┘
│
├─ Tablet: aspect-video (16:9)
│  ┌──────────────────┐
│  │                  │  Video format
│  └──────────────────┘
│
└─ Desktop: aspect-[3/1] (3:1)
   ┌────────────────────────────────┐
   │  Cinema format - wide and short │
   └────────────────────────────────┘

Card/Media:
   All devices: aspect-square (1:1)
   ┌────┐
   │    │  Always square
   │    │
   └────┘
```

---

## 🎨 Spacing Scale

### Padding/Margin Values
```
Tailwind Class | Pixels | Usage
───────────────┼────────┼──────────────────────
p/m-0          | 0      | No space
p/m-1          | 4px    | Tiny
p/m-2          | 8px    | Gap between cards
p/m-3          | 12px   | Small spacing
p/m-4          | 16px   | Section padding mobile
p/m-6          | 24px   | Section padding tablet
p/m-8          | 32px   | Section padding desktop
p/m-10         | 40px   | Large spacing
p/m-12         | 48px   | Section margin
```

### Responsive Spacing Examples
```
Padding (px-4 sm:px-6 md:px-8):
Mobile:  ▌─────────────────────────▌  = 16px each side
         ▌────────────────────────────────▌  = 24px each side
Tablet:
         ▌──────────────────────────────────────────▌  = 32px each side
Desktop:

Gap (gap-2 sm:gap-3 md:gap-4):
Mobile:  ▌ Card ▌ Card ▌  = 8px gap
Tablet:  ▌ Card ▌ Card ▌ Card ▌  = 12px gap
Desktop: ▌ Card ▌ Card ▌ Card ▌ Card ▌  = 16px gap
```

---

## 🔀 Responsive Pattern Examples

### Pattern 1: Full-Width Container
```jsx
// Mobile 100%, tablet 100%, always responsive
className="w-full px-4 sm:px-6 md:px-8"
```

### Pattern 2: Flex with Truncate
```jsx
// Prevents text overflow
className="w-full min-w-0 flex items-center justify-between gap-2"
// ↓ Child that might overflow:
className="truncate min-w-0"
```

### Pattern 3: Grid with Auto Columns
```jsx
// Auto-wraps based on screen size
className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4"
```

### Pattern 4: Aspect Ratio Container
```jsx
// Reserves space, prevents layout shift
className="aspect-square sm:aspect-video md:aspect-[3/1]"
```

### Pattern 5: Responsive Text
```jsx
// Scales text with screen size
className="text-sm sm:text-base md:text-lg lg:text-xl"
```

---

## 🚨 Common Mistakes

### ❌ Mistake 1: Fixed Width
```jsx
❌ className="w-64"  // Always 256px, breaks on mobile
✅ className="w-full"  // Adapts to screen
```

### ❌ Mistake 2: Missing min-w-0
```jsx
❌ className="flex" 
   className="truncate"  // Doesn't work!
   
✅ className="flex min-w-0"
   className="truncate min-w-0"  // Works!
```

### ❌ Mistake 3: No Responsive Padding
```jsx
❌ className="px-8"  // 32px on mobile = too much!
✅ className="px-4 sm:px-6 md:px-8"  // Scales properly
```

### ❌ Mistake 4: Fixed Heights
```jsx
❌ className="h-48"  // Fixed height, image squished
✅ className="aspect-square"  // Maintains proportion
```

### ❌ Mistake 5: Only Testing DevTools
```jsx
❌ "Looks good in DevTools, must be fine"
✅ Always test on real devices!
```

---

## ✅ Responsive Checklist

For any new component:
- [ ] Uses `w-full` (not fixed width)
- [ ] Has `min-w-0` on flex children
- [ ] Has proper aspect ratio (not fixed height)
- [ ] Responsive padding: `px-4 sm:px-6 md:px-8`
- [ ] Responsive gap: `gap-2 sm:gap-3 md:gap-4`
- [ ] Text truncation: `line-clamp-X min-w-0`
- [ ] Tested on real mobile (not just DevTools!)

---

## 🎯 Mobile-First Order

When building, start with these classes (mobile first), then add `sm:`, `md:`, `lg:`, `xl:` variants:

```jsx
className="
  // Mobile defaults
  w-full
  px-4
  grid-cols-2
  gap-2
  text-sm
  
  // Enhanced on tablets
  sm:px-6
  sm:grid-cols-3
  sm:gap-3
  sm:text-base
  
  // Enhanced on desktop
  md:px-8
  md:grid-cols-4
  md:gap-4
  md:text-lg
  
  // Enhanced on large screens
  lg:grid-cols-5
"
```

---

## 📊 Quick Reference Table

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Grid Cols | 2 | 3-4 | 5-6 |
| Padding | 16px | 24px | 32px |
| Gap | 8px | 12px | 16px |
| Hero Aspect | 1:1 | 16:9 | 3:1 |
| Card Aspect | 1:1 | 1:1 | 1:1 |
| Text | sm | base | base/lg |

---

## 🔍 Testing Breakpoints

Open browser DevTools and test these widths:

```
✓ 375px  (Mobile - iPhone)
✓ 480px  (Landscape mobile)
✓ 640px  (Tablet small)
✓ 768px  (Tablet)
✓ 1024px (Desktop)
✓ 1280px (Large desktop)
✓ 1920px (Full HD)

Also test with:
• Real devices
• Different orientations
• Different browsers
• With scrollbars
• With DevTools open
```

---

## 📈 Aspect Ratio Math

If you need custom ratios:

```
Common Ratios:
1:1    (square)     = 100%
16:9   (video)      = 56.25%
4:3    (old TV)     = 75%
3:1    (cinema)     = 33.33%
3:2    (photo)      = 66.67%
21:9   (ultrawide)  = 42.86%

In Tailwind:
aspect-square      → 1:1
aspect-video       → 16:9
aspect-[3/1]       → 3:1
aspect-[4/3]       → 4:3
aspect-[21/9]      → 21:9
```

---

## 🎉 You're Ready!

Use this as a reference when building responsive components. 

**Key Principles:**
✅ Mobile-first (start simple)
✅ Responsive widths (w-full)
✅ Flexible layouts (min-w-0)
✅ Aspect ratios (no fixed heights)
✅ Adaptive spacing (px-4 sm:px-6 md:px-8)
✅ Test real devices (not just DevTools!)

Happy building! 🚀

