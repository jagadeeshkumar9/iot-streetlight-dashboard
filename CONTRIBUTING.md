# Contributing Guide

We welcome contributions! Here's how to get started:

## 1. Fork & Clone

```bash
git clone https://github.com/yourusername/iot-streetlight-dashboard.git
cd iot-streetlight-dashboard
```

## 2. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

## 3. Make Changes

- Follow existing code style
- Add comments for complex logic
- Test thoroughly before committing

## 4. Commit & Push

```bash
git add .
git commit -m "Add feature: description"
git push origin feature/your-feature-name
```

## 5. Create Pull Request

- Describe changes clearly
- Reference related issues
- Request review from maintainers

## Code Style

- Use meaningful variable names
- Add error handling
- Include logging statements
- Write comments for complex sections
- Follow existing project patterns

## Testing

Before submitting:

```bash
# Run linter
npm run lint

# Run tests
npm test

# Build Docker images
docker-compose build

# Test locally
docker-compose up
```

## Reporting Issues

Include:
- Description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Relevant logs or error messages

## Areas for Contribution

- Bug fixes
- Performance improvements
- Documentation
- Feature requests
- UI/UX enhancements
- Mobile app development
- Additional device support

