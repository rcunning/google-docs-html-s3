function createMenu() {
  var ui = DocumentApp.getUi();
  ui.createMenu('Publish to S3')
  .addItem('Publish...', 'showConfig')
  .addToUi();
}

function onInstall() { 
  createMenu();
}

function onOpen() { 
  createMenu();
}

function getGoogleDocumentAsHTML(id){
  var forDriveScope = DriveApp.getStorageUsed(); //needed to get Drive Scope requested
  var url = "https://docs.google.com/feeds/download/documents/export/Export?id="+id+"&exportFormat=html";
  var param = {
    method      : "get",
    headers     : {"Authorization": "Bearer " + ScriptApp.getOAuthToken()},
    muteHttpExceptions:true,
  };
  var html = UrlFetchApp.fetch(url,param).getContentText();
  return html;
}

function publish(event) {
  // do nothing if required configuration settings are not present
  if (!hasRequiredProps()) {
    return;
  }
  
  // get the doc
  var doc = DocumentApp.getActiveDocument();
  var html = getGoogleDocumentAsHTML(doc.getId());
  var objs = {
    copyBlob: function() {},
    getDataAsString: function() { return html; },
    getContentType: function() { return "text/html"; }
  };

  // upload to S3
  // https://engetc.com/projects/amazon-s3-api-binding-for-google-apps-script/
  var props = PropertiesService.getDocumentProperties().getProperties();
  var s3 = S3.getInstance(props.awsAccessKeyId, props.awsSecretKey);
  s3.putObject(props.bucketName, props.path, objs);
}

// show the configuration modal dialog UI
function showConfig() {
  var doc = DocumentApp.getActiveDocument();
  var ui = DocumentApp.getUi();
  var props = PropertiesService.getDocumentProperties().getProperties();
  var template = HtmlService.createTemplateFromFile('config');
  template.docId = doc.getId();
  template.bucketName = props.bucketName || '';
  template.path = props.path || '';
  template.awsAccessKeyId = props.awsAccessKeyId || '';
  template.awsSecretKey = props.awsSecretKey || '';
  ui.showModalDialog(template.evaluate(), 'Amazon S3 publish configuration');
}

// update document configuration with values from form UI
function updateConfig(form) {
  var doc = DocumentApp.getActiveDocument();
  PropertiesService.getDocumentProperties().setProperties({
    bucketName: form.bucketName,
    path: form.path,
    awsAccessKeyId: form.awsAccessKeyId,
    awsSecretKey: form.awsSecretKey
  });
  var message;
  if (hasRequiredProps()) {
    message = 'Published doc is accessible at: \nhttps://' + form.bucketName + '.s3.amazonaws.com/' + form.path;
    publish();
  }
  else {
    message = 'You will need to fill out all configuration options for your doc to be published to S3.';
  }
  var ui = DocumentApp.getUi();
  ui.alert('✓ Published', message, ui.ButtonSet.OK);
}

// checks if document has the required configuration settings to publish to S3
// does not check if the config is valid
function hasRequiredProps() {
  var props = PropertiesService.getDocumentProperties().getProperties();
  return props.bucketName && props.awsAccessKeyId && props.awsSecretKey;
}
