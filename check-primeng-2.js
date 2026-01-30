const fs = require('fs');
const path = require('path');
['dialog', 'tag'].forEach(pkg => {
    try {
        const p = path.join('node_modules', 'primeng', 'fesm2022', `primeng-${pkg}.mjs`);
        if (fs.existsSync(p)) {
            const c = fs.readFileSync(p, 'utf8');
            console.log(pkg, c.match(/class (\w+)/g)?.slice(0, 5));
        } else {
            console.log(pkg, 'not found');
        }
    } catch (e) {
        console.log(pkg, e.message);
    }
});
