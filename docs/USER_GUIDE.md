# Doxa — User Guide

Doxa is a tool for scoring things across several dimensions and seeing the shape
of the result. Rate a character's traits, review a product, audit a skill set —
anything you can break into named criteria with a 0–100 value. Each set of
criteria becomes a chart; charts with matching criteria can be compared
side by side.

---

## Getting started

Doxa opens straight into a usable workspace — **no sign-in required**. Your work
is saved in your browser automatically (the navbar shows a *Local* indicator),
so it's still there when you come back.

### Signing in (optional)

Signing in is only for **cloud sync** — keeping multiple named projects on your
account so they follow you across devices. Use the **Sign in** button in the top
navbar:

- **Create account** — enter an email and password, then check your inbox for a
  confirmation link.
- **Sign in** — returning users sign straight in.

Once signed in, your projects are saved to your account automatically and the
navbar shows the cloud sync status (*Saving…*, *Saved*, *Sync error*). The first
time you sign in on a fresh account, the work you have open is carried up to the
cloud. If the app has no cloud credentials it simply stays in local-only mode.

### Your first project

There are two ways to get going, both from the **Projects** button in the top
navbar (available whether or not you're signed in):

- **New blank project** — an empty canvas you fill in yourself.
- **A template** — open the *Templates* tab and pick one. The template is copied
  into a new project, pre-filled with example charts you can edit freely.

---

## Charts

A chart is a named set of **traits** (criteria), each with a 0–100 value.

### Adding and editing

- **Add New Chart** at the bottom of the control panel creates an empty chart.
- Type a trait name in the **New trait name…** box and press **Add**.
- Drag the slider on each trait row to set its value.
- Click a chart title or trait name to rename it. Click the colour swatch to
  recolour the chart.
- The **⋮ description** button adds an optional note to a chart or trait.

### Chart shapes — radar vs. scatter

The number of traits decides how a chart is drawn:

- **3 or more traits → a radar chart** — a polygon, one spoke per trait.
- **Exactly 2 traits → a scatter plot** — the two traits become the X and Y
  axes and the chart is plotted as a single point.

Adding or removing a trait can cross that boundary and switch the shape.

### Reordering and sorting

- Drag the grip handle on a trait row to reorder traits by hand.
- Drag a chart card by its header to reorder charts.
- The **sort** menu re-sorts traits by value or name. While a sort mode is
  active, manual drag-reordering is locked — switch back to *Custom* to drag
  again.
- A trait can be dragged from one chart onto another to move it across charts.

---

## Comparisons

A comparison overlays two or more charts that **share the same trait names** so
you can read them against each other.

- **Add Comparison** in the control panel creates one.
- Use **Add chart** inside the comparison to add chart slots. The first slot is
  the *baseline* — only charts whose traits match the baseline can be added
  after it.
- The comparison renders all its charts as one overlaid radar (or scatter), plus
  a table of values.
- The **Δ (delta)** column shows the difference between two charts. Turn it on
  from the **Σ** (aggregate stats) menu when exactly two charts are compared.
- The **Σ** menu also adds aggregate **columns** (mean, min, max, sum, median,
  range across charts, per trait) and aggregate **rows** (the same stats per
  chart, across traits).

---

## Templates

The *Templates* tab in the Projects window offers ready-made starting points —
character profiles, product reviews, skill audits, a Hero vs. Villain comparison
demo, and more. Picking a template creates a new project filled with its charts.

Templates are created in **whichever language is active when you pick them**.
Once created, the project's text is yours — changing the app language later does
not retranslate an existing project.

---

## Import and export

Use the **export** menu in the control panel:

- **PNG / SVG Image** — a picture of the view panel, good for sharing.
- **JSON Data** — the full project as data. This is the round-trip format:
  exporting then importing a JSON file restores everything exactly.
- **Markdown** — a human-readable table version.

Use the **import** button to load a Doxa JSON file. You'll be asked whether to
**Replace All** (swap in the imported charts) or **Append** (add them alongside
your current charts).

---

## Language

Doxa is available in **English** and **Turkish**. On first visit it follows your
browser's language automatically.

The **language switcher** in the top navbar (the globe icon) changes the
interface language at any time. Your choice is remembered in this browser, and —
when you're signed in — saved to your account so it follows you across devices.

Switching language updates the interface only. It never changes the text inside
projects you've already created.

---

## Mobile layout

On narrow screens the control panel and the view panel are shown one at a time.
Use the **Control / View** tabs in the navbar to switch between them. On desktop
both panels are visible and scroll in sync.
