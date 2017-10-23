<?php
require_once dirname(__FILE__) . "/bootstrap.php";

$cfg = oxRegistry::get("oxConfig");

$dir = $cfg->getConfigParam("sCompileDir") . "*";
foreach (glob($dir) as $item) {
    if (!is_dir($item)) {
        unlink($item);
    }
}

$dir = $cfg->getConfigParam("sCompileDir") . "smarty/*";
foreach (glob($dir) as $item) {
    if (!is_dir($item)) {
        unlink($item);
    }
}

$aResult = array(
    'message' => "Cache successfully deleted!"
);

header('Content-Type: application/json; charset=UTF-8');
oxRegistry::getUtils()->showMessageAndExit(json_encode($aResult, true));