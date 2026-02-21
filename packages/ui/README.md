# Variable Theme Project

A Material-UI based dashboard implementation with dynamic theme switching (Light/Dark/System modes).

## Project Structure

```
.github/variable-theme/
├── docs/
│   ├── README.md                      # Documentation overview
│   ├── project-setup.md               # Detailed implementation guide
│   └── settings-theme-selector.png    # UI reference screenshot
└── README.md                          # This file
```

## Overview

This project demonstrates how to implement a fantasy sports dashboard with:
- **Material-UI v7.2.0** theme system
- **Dynamic theme switching** between Light, Dark, and System modes
- **Persistent theme preference** using localStorage
- **Responsive design** with App Bar and Drawer navigation
- **State management** for testing and development

## Quick Start

1. Navigate to the `pixel-union` project directory
2. Follow the instructions in [`docs/project-setup.md`](./docs/project-setup.md)
3. Install MUI dependencies
4. Implement the components as outlined

## Key Features

### Theme Switching
- Three modes: Light, Dark, System (follows OS preference)
- Settings dialog with visual mode selector
- Automatic persistence across sessions
- Smooth transitions between modes

### Dashboard Components
- **App Bar** - Header with navigation and settings
- **Drawer** - Side navigation menu
- **Settings Dialog** - Theme mode selector
- **Main Content** - Dashboard content area

### Testing Support
- Mock data infrastructure
- URL parameter-based state loading
- Development-friendly test states

## Documentation

- **[Project Setup Guide](./docs/project-setup.md)** - Complete implementation instructions
- **[Screenshot Reference](./docs/settings-theme-selector.png)** - UI design reference

## Implementation Path

1. Set up theme configuration with color schemes
2. Create Settings Dialog component
3. Build Dashboard layout with App Bar and Drawer
4. Add mock data for testing
5. Test theme switching functionality

## Related Projects

This is part of the Fantasy Union project located in `pixel-union/`.

## Resources

- [MUI Dark Mode Documentation](https://mui.com/material-ui/customization/dark-mode/)
- [MUI Theming Guide](https://mui.com/material-ui/customization/theming/)
- [MUI Component Examples](https://mui.com/material-ui/getting-started/)
