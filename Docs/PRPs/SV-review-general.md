# General Svelte/Tauri Codebase Review

Perform a comprehensive review of the entire Svelte/Tauri codebase focusing on architecture, patterns, and best practices.

Review scope: $ARGUMENTS

If no specific scope provided, review the entire codebase.

## Review Process

1. **Codebase Analysis**
   - Analyze overall project structure and architecture (`src` vs. `src-tauri`).
   - Review component organization and modularity in `src/lib/components`.
   - Check for consistency across the codebase.
   - Identify technical debt and improvement opportunities.

2. **Pattern Consistency**
   - Ensure consistent use of Svelte 5 patterns (runes, etc.).
   - Validate TypeScript usage across files.
   - Check for consistent naming conventions (`kebab-case` for files, `PascalCase` for components).
   - Review import/export patterns.

3. **Performance Assessment**
   - Evaluate bundle size and optimization (`bun build`).
   - Review use of `$derived` to prevent reactive loops.
   - Check for performance bottlenecks in `#each` loops.
   - Assess image optimization usage in `static/`.

## Review Focus Areas

### 1. **Architecture & Structure**

    - SvelteKit static adapter (`adapter-static`) implementation.
    - Component organization (UI components vs. route-level components).
    - State management (`$state`, `$derived`, stores).
    - Tauri IPC command structure in `src-tauri/src/main.rs`.
    - Proper separation of concerns between frontend and backend.

### 2. **TypeScript Quality**

    - Strict mode compliance across all files.
    - Type safety and explicit typing (especially for `load` functions and component `$props`).
    - Interface definitions and exports.
    - Proper use of SvelteKit's generated types (`./$types`).
    - Generic usage and constraints.

### 3. **Svelte-Specific Patterns**

    - Svelte 5 rune usage (`$state`, `$props`, `$effect`, `$derived`).
    - Client-side routing with `goto()`.
    - Data loading in `+page.ts` and `+layout.ts`.
    - Form actions and validation.
    - Store usage for global state.

### 4. **Performance & Optimization**

    - Bundle analysis (`bun build`).
    - Avoiding reactive performance pitfalls.
    - Code splitting and lazy loading where applicable.
    - Efficient data fetching strategies.

### 5. **Security & Validation**

    - Environment variable management (`$env/dynamic/public` vs. `$env/dynamic/private`).
    - Tauri command whitelisting and capabilities.
    - Input validation patterns (e.g., with Zod).
    - API security measures for Convex functions.

### 6. **Code Quality Standards**

    - Component size limits.
    - Function complexity and length.
    - Code duplication assessment.
    - Error handling patterns (`try/catch`, SvelteKit `error` helper).
    - Logging and debugging practices.

### 7. **Testing Coverage**

    - Vitest configuration and usage.
    - Component test coverage.
    - `load` function testing.
    - Integration test quality.
    - Mock usage patterns.

### 8. **Dependencies & Tooling**

    - `bun` usage compliance.
    - Dependency management.
    - Build configuration (`svelte.config.js`, `vite.config.ts`, `tauri.conf.json`).
    - Development tooling setup.

### 9. **Documentation & Maintenance**

    - Code documentation quality (JSDoc).
    - `README.md` and `Docs/guidebook.md` completeness.
    - Component prop documentation.
    - `Docs/` documentation updates.

### 10. **Standards Compliance**

    - Biome linting and formatting configuration.
    - TypeScript strict mode adherence.
    - Build process compliance (`bun build`, `bun tauri build`).
    - Pre-commit hook effectiveness.

## Analysis Commands

Execute these commands to gather comprehensive data:

```bash
# Project structure analysis
tree -I 'node_modules|dist|.git|.svelte-kit|target' -L 3

# TypeScript analysis
bunx tsc --noEmit --listFiles

# Bundle analysis
bun run build && du -sh dist/ .svelte-kit/

# Code quality metrics
rg --stats "bind:" --type svelte
rg --stats "export let" --type svelte # Check for non-rune props
rg --stats "\\$effect" --type svelte
rg --stats "import type" --type ts

# Test coverage
bun run test:coverage

# Dependency analysis
bun pm ls --depth=0
# bun pm audit (if available)
```

## Review Output

Create a comprehensive review report:

```markdown
# Svelte/Tauri Codebase Review #[number]

## Executive Summary

[High-level overview of codebase health, architecture quality, and key findings]

## Architecture Assessment

### 🏗️ Structure Quality: [Grade A-F]

- [Overall architecture assessment]
- [Component organization evaluation]
- [SvelteKit and Tauri integration]

### 📊 Metrics

- Total Components: X (.svelte)
- Bundle Size: X MB
- Test Coverage: X% (Target: 80%)
- TypeScript Compliance: X% strict mode

## Critical Findings

### 🔴 Architecture Issues (Must Fix)

- [Structural problems requiring immediate attention]
- [Performance bottlenecks]
- [Security vulnerabilities]

### 🟡 Pattern Inconsistencies (Should Fix)

- [Inconsistent implementations]
- [Suboptimal patterns]
- [Technical debt items]

### 🟢 Optimization Opportunities (Consider)

- [Performance improvements]
- [Code quality enhancements]
- [Maintainability improvements]

## Quality Assessment

### TypeScript Quality: [Grade A-F]

- Type safety compliance
- Interface definitions
- Strict mode adherence

### Svelte Patterns: [Grade A-F]

- Rune usage effectiveness
- Data loading patterns
- State management strategy

### Performance Score: [Grade A-F]

- Bundle optimization
- Reactive performance
- Loading performance

## Detailed Analysis

### Component Analysis

- [Component size distribution]
- [Reactivity patterns used]
- [Store usage breakdown]
- [Reusability assessment]

### Security Review

- [Environment variable usage]
- [Tauri capabilities review]
- [Input validation patterns]

### Testing Quality

- [Coverage distribution]
- [Test quality assessment]
- [Missing test areas]

## Recommendations

### Immediate Actions (Next Sprint)

1. [Priority fixes with specific file references]
2. [Critical performance improvements]
3. [Security enhancements]

### Medium-term Improvements (Next Month)

1. [Architecture improvements]
2. [Code quality enhancements]
3. [Testing improvements]

### Long-term Strategy (Next Quarter)

1. [Architectural evolution]
2. [Performance optimization strategy]
3. [Maintenance improvements]

## Best Practices Observed

- [Highlight excellent implementations]
- [Patterns worth replicating]
- [Quality code examples]

## Compliance Checklist

- [ ] `bunx tsc --noEmit` passes project-wide
- [ ] `bun lint` zero warnings
- [ ] `bun build` and `bun tauri build` succeed
- [ ] `bun test` 80%+ coverage
- [ ] All components under size limits
- [ ] No `any` types in codebase
- [ ] Proper Svelte 5 rune usage
- [ ] Environment variables typed and secure
- [ ] Security headers implemented if applicable

## Metrics Dashboard

\`\`\`
Code Quality Score: X/100
├── TypeScript Quality: X/25
├── Svelte Patterns: X/25
├── Performance: X/25
└── Testing: X/25

Technical Debt: X hours estimated
Bundle Size: X MB
Build Time: X seconds
Test Coverage: X% (Target: 80%)
\`\`\`

## Next Review

Recommended review frequency: [Monthly/Quarterly]
Focus areas for next review: [Specific areas to monitor]
```

Save report to `PRPs/code_reviews/general_review_[YYYY-MM-DD].md`
