<?php
// This is a REAL Laravel 12 BladeCompiler smoke test for TXBoard's PHP 8.2
// theme dashboard. JS/npm tests alone cannot catch Blade directive bugs.
declare(strict_types=1);

if ($argc < 3) {
    fwrite(STDERR, "Usage: php tests/blade-compile-smoke.php <vendor/autoload.php> <dashboard.blade.php>\n");
    exit(2);
}
require $argv[1];

use Illuminate\Filesystem\Filesystem;
use Illuminate\View\Compilers\BladeCompiler;

$blade = file_get_contents($argv[2]);
if ($blade === false) {
    throw new RuntimeException('Theme dashboard.blade.php not found');
}
if (preg_match('/@json\\s*\\(/', $blade)) {
    throw new RuntimeException('Do not use comma-sensitive @json() in packaged Blade');
}
$compiler = new BladeCompiler(new Filesystem(), sys_get_temp_dir());
$compiled = $compiler->compileString($blade);
$filename = tempnam(sys_get_temp_dir(), 'vv-blade-');
if ($filename === false) {
    throw new RuntimeException('Could not create temporary PHP compilation');
}

try {
    file_put_contents($filename, $compiled);
    $command = escapeshellarg(PHP_BINARY) . ' -l ' . escapeshellarg($filename) . ' 2>&1';
    exec($command, $output, $status);
    if ($status !== 0) {
        throw new RuntimeException('Compiled Blade syntax invalid: ' . implode("\n", $output));
    }

    $render = static function (array $config) use ($filename): string {
        $title = 'TXBoard smoke';
        $version = '0.9.1';
        $description = 'Theme smoke test';
        $logo = '';
        $theme_config = $config;
        ob_start();
        try {
            include $filename;
            return (string) ob_get_clean();
        } catch (Throwable $exception) {
            ob_end_clean();
            throw $exception;
        }
    };

    $default = $render([]);
    if (!str_contains($default, 'items:"dashboard,shop,profile,ticket,menu,!orders"')) {
        throw new RuntimeException('Comma-separated default navigation was truncated');
    }
    if (!str_contains($default, 'window.settings={title:"TXBoard smoke"')) {
        throw new RuntimeException('Generated config script is missing or corrupted');
    }

    $custom = $render(['nav_items' => 'dashboard,shop,!orders']);
    if (!str_contains($custom, 'items:"dashboard,shop,!orders"')) {
        throw new RuntimeException('Custom comma-separated navigation was truncated');
    }

    $injection = $render(['nav_items' => '</script><script>alert(1)</script>']);
    if (str_contains($injection, '</script><script>alert(1)</script>')) {
        throw new RuntimeException('Unsafe HTML script breakout from theme config');
    }
    if (!str_contains($injection, '\\u003C') || !str_contains($injection, '\\u003E')) {
        throw new RuntimeException('json_encode must use HTML-safe JSON_HEX_TAG flags');
    }
    echo "PASS: Laravel Blade compile + php lint + default/custom commas + JSON script escaping\n";
} finally {
    @unlink($filename);
}
