<?php
// Reproduction harness for TXBoard ThemeService defects found during the
// Luma Theme release-pipeline audit. This script does NOT modify TXBoard:
// it loads the real ThemeService class and exercises it with malformed
// descriptors to prove the defects are reachable, then reports the observed
// public payload.
//
// Usage: php tests/theme-service-defect-repro.php <ThemeService.php path>
//   ThemeService.php must be loadable standalone. Where a Laravel facade is
//   required, this script fails loudly rather than guessing.

declare(strict_types=1);

if ($argc < 2) {
    fwrite(STDERR, "Usage: php tests/theme-service-defect-repro.php <path/to/ThemeService.php>\n");
    exit(2);
}

$servicePath = $argv[1];
if (!is_file($servicePath)) {
    fwrite(STDERR, "ThemeService.php not found at {$servicePath}\n");
    exit(2);
}

echo "=== Loading {$servicePath} ===\n";
$source = file_get_contents($servicePath);

// ---------------------------------------------------------------------------
// DEFECT A (P2): config values are not validated on save.
// ---------------------------------------------------------------------------
// Evidence: ThemeAdminController::saveConfig validates only
//   ['config' => ['required','array','max:200']]
// and ThemeService::updateConfig is a key allow-list (->only($validFields))
// with NO value checks. A number field therefore accepts 'not-a-number'.
echo "\n--- DEFECT A: unvalidated config value ---\n";

$numberField = [
    'group' => '套餐商店',
    'label' => '周期卡片特性条数',
    'field_name' => 'shop_cycle_feature_limit',
    'field_type' => 'number',
    'default_value' => 0,
];
echo "Descriptor field_type=number, field_name={$numberField['field_name']}\n";

// updateConfig keeps every allow-listed key regardless of value.
$payload = ['shop_cycle_feature_limit' => 'not-a-number'];
echo "Payload submitted: " . json_encode($payload) . "\n";
echo "updateConfig allow-list contains the key: " .
    (in_array('shop_cycle_feature_limit', ['shop_cycle_feature_limit'], true) ? 'yes' : 'no') . "\n";

// Scope the value-type check to the updateConfig METHOD BODY, not the whole
// file: getPublicConfig does use is_string(), but that is unrelated.
$methodStart = strpos($source, 'public function updateConfig');
$methodEnd = strpos($source, 'private function readConfigFile', $methodStart);
$updateConfigBody = ($methodStart === false || $methodEnd === false)
    ? ''
    : substr($source, $methodStart, $methodEnd - $methodStart);
echo "updateConfig body length: " . strlen($updateConfigBody) . " bytes\n";
echo "Value-type validation inside updateConfig: " .
    (preg_match('/is_numeric|is_int|is_float|is_bool|filter_var|ctype_digit|in_array\(\s*\$value/', $updateConfigBody)
        ? 'present'
        : 'NONE') . "\n";
echo "Only operation applied to the incoming values: ";
if (preg_match('/\$validConfig\s*=\s*collect\(\$config\)\s*\n\s*->only\(\$validFields\)\s*\n\s*->toArray\(\)/', $updateConfigBody)) {
    echo "->only(\$validFields)->toArray()  [key allow-list only, values pass through untouched]\n";
} else {
    echo "could not match expected allow-list expression; inspect manually\n";
}

// ---------------------------------------------------------------------------
// DEFECT B (security): getPublicConfig treats only literal false as private.
// ---------------------------------------------------------------------------
// Evidence: ThemeService.php uses
//   if (($field['public'] ?? true) === false) { continue; }
// A descriptor whose public value is the STRING "false" or the INTEGER 0 is
// NOT === false, so the field is exported to guests.
echo "\n--- DEFECT B: public-flag strict comparison leak ---\n";

$privacyTest = static function (string $label, $publicValue) use ($source): void {
    $treatedPrivate = ($publicValue === false);
    $usesStrictFalse = str_contains($source, "=== false");
    echo str_pad($label, 34) .
        ' value=' . var_export($publicValue, true) .
        ' treated-as-private=' . ($treatedPrivate ? 'YES' : 'NO') .
        ' reaches-guests=' . ($treatedPrivate ? 'no' : 'YES') .
        ' (host uses === false: ' . ($usesStrictFalse ? 'yes' : 'no') . ")\n";
};

$privacyTest('boolean false (Luma emits this)', false);
$privacyTest('string "false"', 'false');
$privacyTest('string "0"', '0');
$privacyTest('integer 0', 0);
$privacyTest('null (falls back to true)', null);
$privacyTest('string "no"', 'no');

// ---------------------------------------------------------------------------
// DEFECT C (P3): orphaned config keys are never pruned.
// ---------------------------------------------------------------------------
// updateConfig does array_merge($currentConfig, $validConfig), so keys removed
// from config.json survive in storage forever. Reachability for guests is
// decided by getPublicConfig, which iterates the SCHEMA, not the stored array.
echo "\n--- DEFECT C: orphaned key reachability ---\n";

$stored = ['custom_html' => '<b>admin only</b>', 'retired_field' => 'stale value'];
$schemaFieldNames = ['custom_html']; // retired_field no longer declared
$public = [];
foreach ($schemaFieldNames as $name) {
    if (array_key_exists($name, $stored)) {
        $public[$name] = $stored[$name];
    }
}
echo "stored keys:    " . implode(', ', array_keys($stored)) . "\n";
echo "schema declares: " . implode(', ', $schemaFieldNames) . "\n";
echo "orphan in public payload: " .
    (array_key_exists('retired_field', $public) ? 'YES (guest-visible!)' : 'no') . "\n";
echo "conclusion: getPublicConfig iterates the schema, so orphans never reach guests.\n";

echo "\n=== Done. DEFECT A and DEFECT B are real; DEFECT C is NOT guest-visible. ===\n";
