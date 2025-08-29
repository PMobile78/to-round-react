#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Автоматический инкремент версии приложения
 * Поддерживает разные типы инкремента: patch, minor, major
 */

function getVersionFromPackageJson() {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageData.version;
}

function incrementVersion(version, type = 'patch') {
    const parts = version.split('.').map(Number);

    switch (type) {
        case 'major':
            parts[0]++;
            parts[1] = 0;
            parts[2] = 0;
            break;
        case 'minor':
            parts[1]++;
            parts[2] = 0;
            break;
        case 'patch':
        default:
            parts[2]++;
            break;
    }

    return parts.join('.');
}

function updatePackageJsonVersion(newVersion) {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageData.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
}

function main() {
    const args = process.argv.slice(2);
    const versionType = args[0] || 'patch'; // по умолчанию patch

    if (!['patch', 'minor', 'major'].includes(versionType)) {
        console.error('Ошибка: Неверный тип версии. Используйте: patch, minor, или major');
        process.exit(1);
    }

    try {
        const currentVersion = getVersionFromPackageJson();
        const newVersion = incrementVersion(currentVersion, versionType);

        console.log(`Обновление версии: ${currentVersion} → ${newVersion} (${versionType})`);

        // Обновляем package.json
        updatePackageJsonVersion(newVersion);

        // Выводим новую версию для использования в CI/CD
        console.log(`NEW_VERSION=${newVersion}`);

        // Если запускается в GitHub Actions, устанавливаем output
        if (process.env.GITHUB_ACTIONS) {
            const fs = require('fs');
            const output = process.env.GITHUB_OUTPUT;
            if (output) {
                fs.appendFileSync(output, `version=${newVersion}\n`);
            }
        }

    } catch (error) {
        console.error('Ошибка при обновлении версии:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { incrementVersion, getVersionFromPackageJson };
