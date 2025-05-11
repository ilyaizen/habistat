# Great! Here’s a full breakdown for replicating Habistat in Figma, including:

1. **Color Palette (Figma Color Styles)**
2. **Typography (Figma Text Styles)**
3. **Component/Frame Hierarchy**
4. **Key UI Components (with Figma construction tips)**
5. **Backgrounds (Grid & Gradation)**
6. **Relevant CSS Snippets for Reference**

---

## 1. Color Palette (Figma Color Styles)

**Light Mode:**
| Name | OKLCH Value | Use |

|-----------------------------|------------------------------------|----------------------------|
| Background | oklch(0.91 0.048 83.6) | App background |
| Foreground | oklch(0.41 0.077 78.9) | Main text |
| Card | oklch(0.92 0.042 83.6) | Cards, popovers |
| Card Foreground | oklch(0.41 0.077 74.3) | Card text |
| Primary | oklch(0.71 0.097 111.7) | Primary buttons, accents |
| Primary Foreground | oklch(0.98 0.005 0) | On primary |
| Secondary | oklch(0.88 0.055 83.6) | Secondary buttons, sidebar |
| Secondary Foreground | oklch(0.51 0.077 78.9) | On secondary |
| Muted | oklch(0.86 0.064 83.7) | Muted backgrounds |
| Muted Foreground | oklch(0.51 0.077 74.3) | Muted text |
| Accent | oklch(0.86 0.055 83.6) | Accent elements |
| Accent Foreground | oklch(0.26 0.016 0) | On accent |
| Destructive | oklch(0.63 0.24 29.2) | Error, destructive |
| Destructive Foreground | oklch(0.97 0.018 0) | On destructive |
| Border | oklch(0.74 0.063 80.8) | Borders |
| Input | oklch(0.74 0.063 80.8) | Input backgrounds |
| Ring | oklch(0.51 0.077 74.3) | Focus rings |
| Sidebar | oklch(0.87 0.059 83.7) | Sidebar bg |
| Sidebar Foreground | oklch(0.41 0.077 78.9) | Sidebar text |
| Sidebar Primary | oklch(0.26 0.016 0) | Sidebar primary |
| Sidebar Primary Foreground | oklch(0.98 0.005 0) | On sidebar primary |
| Sidebar Accent | oklch(0.83 0.058 83.6) | Sidebar accent |
| Sidebar Accent Foreground | oklch(0.26 0.016 0) | On sidebar accent |
| Sidebar Border | oklch(0.91 0.005 0) | Sidebar border |
| Sidebar Ring | oklch(0.71 0.005 0) | Sidebar ring |

**Dark Mode:**
(Use the `.dark` values from `app.css` for dark theme color styles.)

---

## 2. Typography (Figma Text Styles)

- **Font Family:**

  - Main: Inter, system-ui, sans-serif
  - RTL: Noto, Noto Hebrew, Inter, sans-serif
  - Serif: Noto Serif

- **Styles:**

  - Heading 1: 32px, Bold, Inter
  - Heading 2: 24px, SemiBold, Inter
  - Body: 16px, Regular, Inter
  - Small: 14px, Regular, Inter
  - Mono: 14px, Regular, `--font-mono` (for code/uptime)

- **RTL Support:**
  - Create a duplicate set of text styles with RTL direction and Noto Hebrew font.

---

## 3. Component/Frame Hierarchy

**Top-Level Frames:**

- Homepage
- Dashboard (with Sidebar)
- Calendars List
- Calendar Detail (with Habits)
- Habit Detail
- Settings (with subpages: Account, Customization, History, Sync)
- Auth (Sign In, Sign Up, Profile)

**Components:**

- Sidebar (vertical, with nav links and color blocks)
- Header (minimal, with nav and user info)
- Card (rounded, shadow, card color)
- Button (3D, Outline)
- Calendar List Item (name, color, actions)
- Habit List Item (name, timer, actions, completion count)
- Language Selector (dropdown or icon row)
- Usage Monitor (chart placeholder)
- Modal/Dialog

---

## 4. Key UI Components (Figma Construction Tips)

### **Sidebar**

- Vertical frame, width ~240px
- Use `Sidebar` color for background, `Sidebar Foreground` for text
- Add nav links (Dashboard, Calendars, Habits, Settings, Account)
- Use accent/primary color blocks for active/selected states

### **Header**

- Horizontal frame, height ~56px
- Use `Card` or `Background` color
- Place app logo/name left, user info right

### **Card**

- Rectangle, border-radius: 8px (`--radius`)
- Fill: `Card` color
- Shadow: subtle, as per Tailwind’s `shadow-md`

### **Button (3D)**

- Rectangle, border-radius: 8px
- Fill: `Primary` or `Secondary`
- Border-bottom: 4px, `Primary Border`
- Shadow: 0 0 0 1px `Primary Border`
- On hover: move up 2px, on active: move down 1px (simulate with variants)
- Outline variant: transparent fill, border color as per `.button-outline`

### **Language Selector**

- Row of flag icons or dropdown
- Use `Accent` color for selected

### **Usage Monitor**

- Placeholder for chart (use Figma’s chart plugin or rectangle with “Chart” label)

### **Modal/Dialog**

- Centered card, with overlay
- Use `Card` color, `Card Foreground` for text

---

## 5. Backgrounds (Grid & Gradation)

### **Grid Background**

- Add a rectangle covering the frame
- Apply a grid fill:
  - 32px spacing, 1px lines, color: oklch(0.922 0 0 / 0.4) (light), oklch(0.269 0 0 / 0.4) (dark)
- Set as background layer, lock it

### **Gradation Background**

- Add a rectangle covering the frame
- Apply a linear gradient fill:
  - From: oklch(0.93 0.08 0deg / 50%)
  - To: oklch(0.93 0.08 300deg / 50%)
  - (For dark: oklch(0.2 0.08 0deg / 50%) to oklch(0.2 0.08 300deg / 50%))
- For animation: simulate with multiple frames or use Figma’s prototyping

---

## 6. Relevant CSS Snippets

**3D Button:**

```css
.btn-3d {
  border-bottom: 4px solid var(--primary-border);
  box-shadow: 0 0 0 1px var(--primary-border);
  transition: transform 0.1s ease-out;
}
.btn-3d:hover:not(:disabled) {
  transform: translateY(-2px);
  border-bottom-width: 4px;
}
.btn-3d:active:not(:disabled) {
  transform: translateY(1px);
  border-bottom-width: 2px;
  box-shadow: 0 0 0 1px var(--primary-border);
  transition: border-bottom-width 0.1s ease-out;
}
```

**Grid Background:**

```css
.grid-background {
  background:
    linear-gradient(90deg, oklch(0.922 0 0 / 0.4) 1px, transparent 1px),
    linear-gradient(oklch(0.922 0 0 / 0.4) 1px, transparent 1px);
  background-size: 32px 32px;
}
.dark .grid-background {
  background:
    linear-gradient(90deg, oklch(0.269 0 0 / 0.4) 1px, transparent 1px),
    linear-gradient(oklch(0.269 0 0 / 0.4) 1px, transparent 1px);
}
```

**Gradation Background:**

```css
.gradation-background {
  background-image:
    linear-gradient(
      in oklch longer hue to right,
      oklch(0.93 0.08 var(--hue1) / 50%),
      oklch(0.93 0.08 var(--hue2) / 50%)
    ),
    linear-gradient(
      in oklch longer hue to bottom,
      oklch(0.93 0.08 var(--hue1) / 50%),
      oklch(0.93 0.08 var(--hue2) / 50%)
    );
}
.dark .gradation-background {
  background-image:
    linear-gradient(
      in oklch longer hue to right,
      oklch(0.2 0.08 var(--hue1) / 50%),
      oklch(0.2 0.08 var(--hue2) / 50%)
    ),
    linear-gradient(
      in oklch longer hue to bottom,
      oklch(0.2 0.08 var(--hue1) / 50%),
      oklch(0.2 0.08 var(--hue2) / 50%)
    );
}
```

---

## 7. Figma Setup Tips

- **Create a “Styles” page** for all color and text styles.
- **Use Auto Layout** for all components and frames.
- **Build a “Components” page** for Sidebar, Header, Card, Button, etc.
- **Use Variants** for buttons (default, hover, active, outline).
- **Lock background layers** (grid, gradation) to avoid accidental edits.
- **Use Figma’s “Selection Colors”** to quickly apply your palette to new elements.

---

## 8. Frame/Component Hierarchy Example

```txt
App (Frame)
├── Grid Background (locked)
├── Gradation Background (locked)
├── Sidebar (Component)
│   ├── Nav Links
│   └── User Info
├── Header (Component)
│   └── App Logo/Name
├── Main Content (Auto Layout)
│   ├── Dashboard / Calendars / Habits / Settings / Auth (Frames)
│   │   ├── Card (Component)
│   │   ├── Button (Component)
│   │   ├── List Items (Component)
│   │   └── Usage Monitor (Chart Placeholder)
└── Modal/Dialog (Component, hidden by default)
```

---

**You can now use this as a blueprint to build out the Habistat UI in Figma. If you want, I can start creating rectangles, frames, and text in your Figma file using TalkToFigma—just tell me which screen or component you want to start with!**
