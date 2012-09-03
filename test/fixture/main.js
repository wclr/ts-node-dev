// Try running this as `node-dev main` instead of `node-dev main.js`:
if (module !== require.main) {
    console.error('Expected to be the main module; not the case.')
    process.exit(1);
} else {
    process.exit(0);
}
