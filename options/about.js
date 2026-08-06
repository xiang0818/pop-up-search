
let manifest = chrome.runtime.getManifest();

$('[manifest-info=name]').html(manifest.name);
$('[manifest-info=version]').html(manifest.version);
