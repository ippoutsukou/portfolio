---
name: Portfolio Design & Development
description: Guidelines and code snippets for maintaining the "Gentle White" trustworthy aesthetic of the portfolio site.
---

# Portfolio Design & Development Skill

This skill provides the design tokens, component patterns, and workflows for the portfolio site.

## 1. Design System

### Colors (Gentle White Theme)
- **Background**: `var(--bg)` -> `#f8f9fa` (Off-white)
- **Foreground**: `var(--fg)` -> `#334155` (Slate 700)
- **Headings**: `var(--heading)` -> `#0f172a` (Slate 900)
- **Muted Text**: `var(--muted)` -> `#64748b` (Slate 500)
- **Primary**: `var(--primary)` -> `#2563eb` (Blue 600)
- **Primary Text**: `var(--primary-fg)` -> `#ffffff` (White)
- **Card Background**: `var(--card-bg)` -> `#ffffff` (White)
- **Border**: `var(--border)` -> `#e2e8f0` (Slate 200)

### Typography
- **Font Family**: `"Noto Sans JP", ui-sans-serif, system-ui...`
- **Headings**: Bold, Darker (`--heading`), Letter-spacing `-0.03em`.
- **Body**: Line-height `1.7` for readability.

### Shadows
- **Soft**: `0 4px 6px -1px rgba(0, 0, 0, 0.05)...`
- **Large (Hover)**: `0 10px 15px -3px rgba(0, 0, 0, 0.05)...`

## 2. Component Patterns

### Buttons
**Primary Button:**
```html
<a class="btn primary" href="#link">Text</a>
```

**Secondary Button:**
```html
<a class="btn" href="#link">Text</a>
```

### Cards
**Standard Card:**
```html
<div class="card">
    <h3>Title</h3>
    <p>Description text goes here.</p>
</div>
```

**Effects Toggle (Switch):**
```html
<div class="effects-toggle">
    <label for="id">Label</label>
    <input id="id" type="checkbox" />
</div>
```

## 3. Implementation Workflow

### Adding a New Section
1.  **Define ID**: Choose a descriptive ID (e.g., `#skills`).
2.  **Structure**:
    ```html
    <section class="section" id="skills">
        <!-- Optional Section Header -->
        <h2 style="font-size: 24px; font-weight: 700; color: var(--heading); margin-bottom: 24px;">Skills</h2>
        <div class="cards">
            <!-- content -->
        </div>
    </section>
    ```
3.  **Update Navigation**: Ensure the new section is accessible.

### Responsive Check
- **Checkpoint**: Width <= 820px.
- **Behavior**:
    - Grid columns become 1fr (stack vertically).
    - Padding increases/decreases as needed.
    - Text alignment might shift to left for Hero.

### Performance
- **Particles**: Keep density low (`0.00005`) and use optimized canvas drawing (shared fillStyle).
- **Images**: Use lazy loading (`loading="lazy"`) and correct sizing.
