# Modern UI Version

This is the modern/contemporary UI version of Cherry's Labs.

## Viewing Locally

Simply open `index.html` in your web browser.

## Current Status

Homepage (`index.html`) is complete. Additional pages (projects, programs, store, wiki) will follow the same design patterns.

## Design Features

- **Colors**: Black background with pink (#ec4899) and purple (#9354d3) accents
- **Layout**: Clean, centered design with subtle rounded corners
- **Typography**: System fonts for native feel (-apple-system, BlinkMacSystemFont, "Segoe UI", Arial)
- **Cards**: Soft shadows with smooth hover effects
- **Animations**: Subtle fade-in effects on page load
- **Responsive**: Mobile-first design, cards stack on small screens

## Structure

```
modern/
├── index.html       ✅ Complete
├── projects.html    ⏳ To be built
├── programs.html    ⏳ To be built
├── store.html       ⏳ To be built
├── wiki.html        ⏳ To be built
├── style.css        ✅ Complete
└── images/          (Currently using ../retro/images/)
```

## Styling

All styling is in `style.css` using CSS custom properties (variables) for easy theming. The design follows DRY, KISS, and YAGNI principles to keep code maintainable.
