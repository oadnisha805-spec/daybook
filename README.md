# Daybook

A task manager website that runs entirely in the browser. No server, no build step, no dependencies.

- `index.html` is the landing page
- `app.html` is the task manager itself

## Features

- Create, read, update and delete tasks
- Categories (Work, Personal, Study, Other) and due dates
- Overdue highlighting
- Filter by status (All, Active, Completed) and by category
- Live search
- Drag-and-drop reordering (mouse and touch), or arrow keys on the drag handle
- Completion animations
- Undo after delete or "Clear completed"
- Automatic light and dark theme
- Data saved in `localStorage`, so tasks survive page reloads

## Project structure

```
daybook-project/
├── index.html        Landing page
├── app.html          Task manager
├── css/
│   ├── tokens.css    Colours and fonts (light and dark), shared by both pages
│   ├── landing.css   Landing page styles
│   └── app.css       Task manager styles
├── js/
│   └── app.js        State, rendering, storage and event handling
└── README.md
```

## Run it locally

Open `index.html` in a browser. Or serve the folder:

```
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Put it online (free)

### Option 1: GitHub Pages (permanent link, good for a CV or internship report)

1. Create a new public repository on GitHub, for example `daybook`.
2. Upload everything inside this folder (`index.html`, `app.html`, `css/`, `js/`, `README.md`).
3. Open the repository's Settings, then Pages.
4. Under "Build and deployment", choose "Deploy from a branch", select `main` and `/ (root)`, then Save.
5. After a minute your site is live at `https://YOUR-USERNAME.github.io/daybook/`.

### Option 2: Netlify Drop (fastest)

1. Go to https://app.netlify.com/drop
2. Drag this whole folder onto the page.
3. Netlify gives you a link. Sign in with a free account to keep the site permanently.

## How it works

- `tasks` is the single source of truth: an array of `{ id, title, cat, due, done }`.
- `saveToLocalStorage()` writes the array under the key `daybook.tasks.v1` after every change.
- `loadFromLocalStorage()` reads it on startup. On the very first visit the app loads a few sample tasks.
- `render()` rebuilds the list from `tasks` using the active filter, category and search text.

## Customising

- Colours live at the top of `css/tokens.css` as CSS variables.
- Categories are defined in the `CATS` array in `js/app.js` and in the `<select>` in `app.html`.
- Add your name and GitHub link in the footer of `index.html`.

## Reference

- [MDN: localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
