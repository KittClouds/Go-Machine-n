const fs = require('fs');
const path = require('path');

const packages = ['textarea', 'select', 'toggleswitch', 'tabs', 'popover'];

packages.forEach(pkg => {
    try {
        const pkgPath = path.join('node_modules', 'primeng', 'fesm2022', `primeng-${pkg}.mjs`);
        if (fs.existsSync(pkgPath)) {
            const content = fs.readFileSync(pkgPath, 'utf8');
            const exports = content.match(/class (\w+)/g);
            console.log(`${pkg}:`, exports ? exports.slice(0, 5) : 'No classes found');
        } else {
            console.log(`${pkg}: File not found at ${pkgPath}`);
            // Try generic
            const pkgPath2 = path.join('node_modules', 'primeng', 'fesm2022', `primeng.mjs`);
            if (fs.existsSync(pkgPath2)) {
                console.log(`${pkg}: Checking main bundle...`);
            }
        }
    } catch (e) {
        console.error(`${pkg}: Error`, e.message);
    }
});
