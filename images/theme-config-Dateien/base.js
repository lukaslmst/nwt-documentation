Ext.define('Enlight.app.Window', {
ui: 'default',
width: 800,
height: 600,
maximizable: true,
minimizable: true,
stateful: true,
border: false,
minimized: false,
focusable: true,
closePopupTitle: 'Close module',
closePopupMessage: 'This will close all windows of the "__MODULE__" module. Do you want to continue?',
hideOnClose: true,
forceToFront: false,
extend: 'Ext.window.Window',
requires: [ 'Ext.WindowManager' ],
footerButton: true,
isWindowOnFront: false,
activeCls: Ext.baseCSSPrefix + 'window-active',
isMainWindow: false,
isSubWindow: false,
centerOnStart: true,
onAfterRenderComponent: function() {
var me = this,
subApp = me.subApplication || me.subApp, windowManager, windowCount;
if(!subApp) {
return;
}
windowManager = subApp.windowManager;
windowCount = windowManager.subWindows.getCount();
windowManager.register(me, true, true);
if(windowManager.zIndexStack.length == 1) {
var mainWindow = me;
mainWindow.isMainWindow = true;
windowManager.mainWindow = mainWindow;
mainWindow.on({
beforeclose: me.onBeforeDestroyMainWindow,
scope: me
});
} else {
if(!windowManager.multipleSubWindows && windowCount == 1) {
if(Ext.isDefined(Ext.global.console)) {
Ext.global.console.warn('Enlight.app.Window: The sub application is configured to only support one opened sub window at once.');
}
}
this.$subWindowId = Ext.id();
windowManager.subWindows.add(this.$subWindowId, this);
me.isSubWindow = true;
me.on({
scope: me,
beforedestroy: function() {
windowManager.subWindows.removeAtKey(this.$subWindowId);
}
});
}
windowManager.bringToFront(me);
},
onBeforeDestroyMainWindow: function () {
var me = this,
subApp = me.subApplication,
windowManager, count, subWindows,
subWindowConfirmationBlackList = [ 'Shopware.apps.Category', 'Shopware.apps.Voucher' ];
if (!subApp.hasOwnProperty('windowManager') || !subApp.windowManager) {
return true;
}
windowManager = subApp.windowManager;
count = windowManager.subWindows.getCount();
if (!count) {
if (Ext.isFunction(me.hide)) {
me.hide();
return true;
}
}
subWindows = windowManager.subWindows.items;
if (Ext.Array.contains(subWindowConfirmationBlackList, me.subApplication.$className)) {
me.closeSubWindows(subWindows, windowManager);
return true;
}
Ext.Msg.confirm(
me.closePopupTitle,
me.closePopupMessage.replace('__MODULE__', me.title),
function (button) {
if (button == 'yes') {
me.closeSubWindows(subWindows, windowManager);
me.destroy();
}
}
);
return false;
},
initComponent: function() {
var me = this;
me.subApplication = me.initialConfig.subApp || this.subApp;
delete this.subApp;
if(!me.preventHeader) {
me.constrain = true;
me.isWindow = true;
}
me.on({
dragstart: me.onMoveStart,
dragend: me.onMoveEnd
}, me);
var viewport = Shopware.app.Application.viewport;
if(viewport && Shopware.apps.Index && me.forceToFront == false) {
var activeDesktop = viewport.getActiveDesktop(),
activeEl = activeDesktop.getEl();
me.desktop = activeDesktop;
me.desktopPosition =  viewport.getActiveDesktopPosition();
me.renderTo = activeEl;
me.constrainTo = activeEl;
} else {
me.renderTo = Ext.getBody();
}
if(!me.footerButton) {
me.maximizable = false;
me.minimizable = false;
}
if(me.forceToFront) {
me.minimizable = false;
}
me.callParent(arguments);
if(me.centerOnStart) {
me.center();
}
me.isWindowOnFront = true;
},
afterShow: function() {
var me = this;
me.callParent(arguments);
Ext.Function.defer(function() {
window.scrollTo(0, 0);
}, 10);
if(me.forceToFront) {
var el = me.getEl(), elDom;
if(!el) {
return false;
}
elDom = el.dom;
elDom.style.zIndex = "999999";
}
},
setTitle: function(title) {
var me = this;
me.callParent(arguments);
if(me.footerButton && me._toolbarBtn) {
me._toolbarBtn.setText(title);
}
},
afterRender: function() {
var me = this;
me.callParent(arguments);
me.onAfterRenderComponent.call(me);
if(me.footerButton) {
Shopware.WindowManagement.addItem(me.title, me);
}
},
minimize: function() {
this.fireEvent('minimize', this);
this.minimized = true;
this.hide();
if(this._toolbarBtn) {
this._toolbarBtn.toggle(false, true);
}
},
doClose: function() {
var me = this;
if(me.hideOnClose) {
me.hideOnClose = false;
me.hide(me.animateTarget, me.doClose, me);
}
if (me.hidden) {
me.fireEvent('close', me);
if (me.closeAction == 'destroy') {
this.destroy();
}
} else {
me.hide(me.animateTarget, me.doClose, me);
}
if(this._toolbarBtn) {
Shopware.WindowManagement.removeItem(this._toolbarBtn);
}
},
onMoveStart: function() {
var me = this, activeWindows = Shopware.app.Application.getActiveWindows(), viewport = Shopware.app.Application.viewport;
if(viewport) {
me.hiddenLayer = viewport.getHiddenLayer();
me.hiddenLayer.setStyle('z-index', '9999999');
me.hiddenLayer.appendTo(Ext.getBody());
}
Ext.each(activeWindows, function(window) {
if(window != me) {
if(window.$className !== 'Shopware.apps.Deprecated.view.main.Window') {
window.ghost('', true);
}
}
});
},
onMoveEnd: function() {
var me = this, activeWindows = Shopware.app.Application.getActiveWindows(), viewport = Shopware.app.Application.viewport;
Ext.each(activeWindows, function(window) {
if(!window.minimized && window != me) {
if(window.$className !== 'Shopware.apps.Deprecated.view.main.Window') {
window.unghost(true, true, true);
}
}
});
if(viewport) {
viewport.jumpTo(me.desktopPosition, true);
me.hiddenLayer.setStyle('z-index', null);
Ext.removeNode(me.hiddenLayer.dom);
}
},
onMouseDown: function() {
var me = this,
subApp = me.subApplication || me.subApp;
if (!subApp) {
return;
}
var windowManager = subApp.windowManager;
try {
windowManager.bringToFront(me);
} catch(e) {}
me.callParent(arguments);
},
fitContainer: function() {
var me = this,
parent = me.floatParent,
container = parent ? parent.getTargetEl() : me.container,
size = container.getViewSize(false);
me.setSize(size);
me.setPosition(0, 0);
},
maximize: function() {
var me = this;
if (!me.maximized) {
me.expand(false);
if (!me.hasSavedRestore) {
me.restoreSize = me.getSize();
me.restorePos = me.getPosition(true);
}
if (me.maximizable) {
me.header.tools.maximize.hide();
me.header.tools.restore.show();
}
me.maximized = true;
me.el.disableShadow();
if (me.dd) {
me.dd.disable();
}
if (me.resizer) {
me.resizer.disable();
}
if (me.collapseTool) {
me.collapseTool.hide();
}
me.el.addCls(Ext.baseCSSPrefix + 'window-maximized');
me.container.addCls(Ext.baseCSSPrefix + 'window-maximized-ct');
me.syncMonitorWindowResize();
me.fitContainer();
me.fireEvent('maximize', me);
}
return me;
},
restore: function() {
var me = this,
header = me.header,
tools = header.tools;
if (me.maximized) {
delete me.hasSavedRestore;
me.removeCls(Ext.baseCSSPrefix + 'window-maximized');
if (tools.restore) {
tools.restore.hide();
}
if (tools.maximize) {
tools.maximize.show();
}
if (me.collapseTool) {
me.collapseTool.show();
}
me.maximized = false;
me.setPosition(me.restorePos);
me.setSize(me.restoreSize);
delete me.restorePos;
delete me.restoreSize;
me.el.enableShadow(true);
if (me.dd) {
me.dd.enable();
if (header) {
header.addCls(header.indicateDragCls)
}
}
if (me.resizer) {
me.resizer.enable();
}
me.container.removeCls(Ext.baseCSSPrefix + 'window-maximized-ct');
me.syncMonitorWindowResize();
me.doConstrain();
me.fireEvent('restore', me);
}
return me;
},
closeSubWindows: function(subWindows, windowManager) {
Ext.each(subWindows, function(subWindow) {
if(subWindow) {
windowManager.subWindows.removeAtKey(subWindow.$subWindowId);
subWindow.destroy();
}
});
}
});
Ext.define('Enlight.app.SubWindow', {
extend: 'Enlight.app.Window',
alias: 'widget.subwindow',
footerButton: false,
isSubWindow: true
});
Ext.define('Enlight.app.SubApplication', {
extend: 'Ext.app.Controller',
requires: [
'Ext.ModelManager',
'Ext.data.Model',
'Ext.data.StoreManager',
'Ext.ComponentManager',
'Ext.app.EventBus',
'Ext.ZIndexManager',
'Enlight.app.Window'
],
scope             : undefined,
beforeLaunch : Ext.emptyFn,
launch       : Ext.emptyFn,
initControllers: true,
eventbus: null,
multipleSubWindows: true,
constructor: function(config){
config = config || {};
var me          = this,
controllers = Ext.Array.from(config.controllers);
me.eventbus = Ext.create('Ext.app.EventBus');
me.windowManager = Ext.create('Ext.ZIndexManager');
me.windowManager.multipleSubWindows = me.multipleSubWindows;
Ext.apply(config, {
documentHead : Ext.getHead(),
id           : config.id
});
Ext.apply(me, {
appControllers : (controllers.length) ? controllers : me.controllers,
controllers    : Ext.create('Ext.util.MixedCollection'),
stores         : Ext.create('Ext.util.MixedCollection'),
eventbus       : me.eventbus,
windowManager  : me.windowManager
});
me.callParent(arguments);
},
init: function() {
var me = this;
Shopware.app.Application.fireEvent('subAppLoaded', me);
me.onBeforeLaunch();
},
addController: function(controller, skipInit) {
var me = this,
app = me.app,
controllers = me.controllers,
prefix = Ext.Loader.getPrefix(controller.name);
controller.application = app;
controller.subApplication = me;
controller.id = controller.id || controller.name;
if (prefix === '' || prefix === controller.name) {
controller.name = this.name + '.controller.' + controller.name;
}
if (Ext.isDefined(controller.name)) {
var name = controller.name;
delete controller.name;
controller = Ext.create(name, controller);
}
controller.$controllerId = Ext.id()
controllers.add(controller.$controllerId, controller);
if (!skipInit) {
controller.init();
}
return controller;
},
removeController: function(controller, removeListeners) {
removeListeners = removeListeners || true;
var me          = this,
controllers = me.controllers;
var key = controllers.indexOf(controller);
controllers.removeAt(key);
if (removeListeners) {
var bus = me.eventbus;
bus.uncontrol([controller.id]);
}
},
addSubApplication: function(subapp) {
var me      = this,
app     = me.app,
subapps = app.subApplications;
subapp.$subAppId = Ext.id();
subapps.add(subapp.$subAppId, subapp);
return subapp;
},
removeSubApplication: function(subapp) {
var me      = this,
app     = me.app,
subapps = app.subApplications;
var key = subapps.indexOf(subapp);
subapps.removeAt(key);
},
onBeforeLaunch: function() {
var me          = this,
app         = me.app,
controllers = me.appControllers,
windowManager = me.windowManager,
controller, cmp;
if(!windowManager.hasOwnProperty('mainWindow')) {
windowManager.mainWindow = null;
}
if(!windowManager.hasOwnProperty('subWindows')) {
windowManager.subWindows = Ext.create('Ext.util.MixedCollection');
}
if (app) {
Ext.each(controllers, function(controlName) {
controller = me.addController({
name: controlName
}, !me.initControllers);
});
delete me.appControllers;
Ext.applyIf(app, {
subApplications : Ext.create('Ext.util.MixedCollection')
});
me.addSubApplication(me);
}
if(Shopware.app.Application.moduleLoadMask) {
Shopware.app.Application.moduleLoadMask.hide();
}
me.beforeLaunch.call(me.scope || me);
cmp = me.launch.call(me.scope || me);
if (cmp) {
me.cmp = cmp;
me.cmp.on('destroy', me.handleSubAppDestroy, me, { single: true });
}
},
handleSubAppDestroy: function(cmp) {
var me             = this,
controllers    = me.controllers;
controllers.each(function(controller) {
me.removeController(controller);
});
me.removeSubApplication(me);
me.eventbus = null;
me.windowManager = null;
me = null;
},
getModuleClassName: function(name, type) {
var namespace = Ext.Loader.getPrefix(name);
if (namespace.length > 0 && namespace !== name) {
return name;
}
return this.name + '.' + type + '.' + name;
},
getController: function(name) {
var controller = this.controllers.findBy(function(item) {
if(item.id === name) {
return true;
}
}, this);
if (!controller) {
return this.addController({ name: name});
}
return controller;
},
getStore: function(name) {
var store = this.stores.get(name);
if (!store) {
store = Ext.StoreManager.get(name);
if(store && !store.autoLoad) {
store = null;
}
}
if (!store) {
store = Ext.create(this.getModuleClassName(name, 'store'), {
application: this,
storeId: name,
id: name
});
this.stores.add(store);
}
return store;
},
getModel: function(model) {
model = this.getModuleClassName(model, 'model');
return Ext.ModelManager.getModel(model);
},
getView: function(view) {
view = this.getModuleClassName(view, 'view');
var cls = Ext.ClassManager.get(view);
cls.prototype.subApp = this;
return cls;
},
control: function(selectors, listeners, controller) {
if(this.hasOwnProperty('eventbus') && this.eventbus) {
this.eventbus.control(selectors, listeners, controller);
} else {
return false;
}
},
setAppWindow: function(win) {
var me = this;
if(win.isSubWindow) {
win.isSubWindow = false;
me.windowManager.subWindows.removeAtKey(win.$subWindowId);
delete win.$subWindowId;
}
if(me.cmp) {
me.un('beforeclose', me.cmp.onBeforeDestroyMainWindow, me);
me.un('destory', me.handleSubAppDestroy, me);
}
me.cmp = win;
me.cmp.on({
destroy: me.handleSubAppDestroy,
scope: me
});
me.cmp.on({
beforeclose: me.cmp.onBeforeDestroyMainWindow,
scope: me.cmp
});
win.mainWindow = true;
me.windowManager.bringToFront(win);
return me.windowManager.mainWindow = win;
}
});
Ext.Class.registerPreprocessor('shopware.subappLoader', function(cls, data, hooks, fn) {
var className = Ext.getClassName(cls),
match = className.match(/^(Shopware|Enlight)\.controller\.|(.*)\.apps\./),
requires = [],
modules = ['model', 'view', 'store', 'controller'],
prefix;
if (!data.hasOwnProperty('extend') || data.extend.prototype.$className != 'Enlight.app.SubApplication' || match === null) {
return true;
}
var i, ln, module,
items, j, subLn, item;
if(data.name === undefined) {
data.name = className;
}
if(data.loadPath !== undefined) {
Ext.Loader.setPath(data.name, data.loadPath, '', data.bulkLoad);
}
for (i = 0,ln = modules.length; i < ln; i++) {
module = modules[i];
items = Ext.Array.from(data[module + 's']);
for (j = 0,subLn = items.length; j < subLn; j++) {
item = items[j];
prefix = Ext.Loader.getPrefix(item);
if (prefix === '' || prefix === item) {
requires.push(data.name + '.' + module + '.' + item);
} else {
requires.push(item);
}
}
}
Ext.require(requires, Ext.pass(fn, [cls, data, hooks], this));
return false;
}, true, 'after', 'loader');
Ext.define('Enlight.app.Controller', {
extend: 'Ext.app.Controller',
getController: function(name) {
return this.subApplication.getController(name);
},
getStore: function(name) {
return this.subApplication.getStore(name);
},
getModel: function(model) {
return this.subApplication.getModel(model);
},
getView: function(view) {
return this.subApplication.getView(view);
},
getEventBus: function() {
return this.subApplication.eventbus;
},
control: function(selectors, listeners) {
var me = this;
if(me.subApplication) {
me.subApplication.control(selectors, listeners, me);
} else {
me.application.control(selectors, listeners, me);
}
}
});
Ext.define('Ext.util.FileUpload', {
extend: 'Ext.container.Container',
alternateClassName: [ 'Ext.FileUpload', 'Shopware.app.FileUpload' ],
alias: 'widget.html5fileupload',
padding: 20,
requestURL: null,
supportsFileAPI: !!window.FileReader,
showInput: true,
checkAmount: true,
maxAmount: 3,
maxAmountErrorFunction: Ext.emptyFn,
checkType: true,
validTypes: [
'gif', 'png', 'tiff',
'jpeg', 'jpg', 'jpe',
'rar', 'zip', 'tar'
],
validTypeErrorFunction: Ext.emptyFn,
checkSize: false,
maxSize: 2097152,
maxSizeErrorFunction: Ext.emptyFn,
afterUploadFunction: Ext.emptyFn,
fileInputConfig: {
name: 'images[]',
fieldLabel: 'Bild(er) auswählen',
buttonText: 'Bild(er) selektieren',
labelStyle: 'font-weight: 700',
labelWidth: 125,
allowBlank: true,
width: 450,
buttonConfig: {
cls: 'secondary small',
iconCls: 'sprite-inbox-image'
}
},
inputConfig: {},
dropZoneCls: '-dropzone',
dropZoneOverCls: 'dropzone-over',
dropZoneDropCls: 'dropzone-drop',
dropZoneText: 'oder drag & drop die Dateien hier rein',
dropItemCls: 'dropzone-item',
dropItemImageCls: 'dropzone-item-image',
dropItemInfoCls: 'dropzone-item-info',
dropItemTpl: [
'<div class="{infoCls}">',
'<p><strong>Name:</strong> {name:ellipsis(30)}</p>',
'<p><strong>Gr&ouml;&szlig;e:</strong> {size}kB</p>',
'</div>'
],
progressBarCls: 'dropzone-item-progress-bar',
progressBarTpl: [
'<span style="width: {percent}%"></span>'
],
initial: true,
fileField: 'fileId',
enablePreviewImage: true,
previewEnabledCls: 'preview-image-displayed',
showLegacyBrowserNotice: false,
hideOnLegacy: false,
snippets: {
uploadReady: 'Dateien hochgeladen',
filesFrom: 'von',
messageText: '[0] Dateien hochgeladen',
messageTitle: 'Medienverwaltung',
legacyMessage: 'Dein Browser unterstützt nicht die benötigten Funktionen für einen Drag&Drop-Upload.',
maxUploadSizeTitle: 'Die Datei ist zu groß',
maxUploadSizeText: 'Die selektierte Datei überschreitet die maximal erlaubte Uploadgröße. Bitte wähle eine andere Datei aus.',
extensionNotAllowedTitle: 'Dateiendung wird nicht unterstützt',
extensionNotAllowedText: 'Dateiendung wird nicht unterstützt',
blackListTitle: 'Blacklist',
blackListMessage: "Die Datei [0] ist nicht erlaubt!"
},
initComponent: function () {
var me = this;
me.items = me.items || [];
if (!me.requestURL) {
Ext.Error.raise(me.$className + ' needs the property "requestURL"');
}
if (me.supportsFileAPI) {
me.dropZone = me.createDropZone();
me.items.push(me.dropZone);
} else {
me.showInput = true;
me.enablePreviewImage = false;
if (me.hideOnLegacy) {
me.showInput = false;
me.showLegacyBrowserNotice = false;
me.hidden = true;
}
}
if (me.showInput) {
if (me.showLegacyBrowserNotice) {
me.fileInputConfig.supportText = me.snippets.legacyMessage;
}
me.fileInput = me.createFileInputField();
me.items.push(me.fileInput);
}
if (me.maxSizeErrorFunction == Ext.emptyFn) {
me.maxSizeErrorFunction = me.maxSizeErrorCallback;
}
me.addEvents('fileUploaded', 'uploadReady', 'uploadFailed');
me.callParent(arguments);
},
createDropZone: function () {
var me = this, dropZone, text;
text = Ext.create('Ext.Component', {
renderTpl: me.createDropZoneTemplate(),
renderData: {
text: me.dropZoneText
}
});
dropZone = Ext.create('Ext.container.Container', {
focusable: false,
cls: me.baseCls + me.dropZoneCls,
items: [ text ]
});
me.on('afterrender', me.createDropZoneEvents, me);
return dropZone;
},
maxSizeErrorCallback: function() {
var me = this;
Ext.Msg.alert(me.snippets.maxUploadSizeTitle, me.snippets.maxUploadSizeText);
me.dropZone.removeAll();
var text = Ext.create('Ext.Component', {
renderTpl: me.createDropZoneTemplate(),
tpl: me.createDropZoneTemplate(),
renderData: {
text: me.dropZoneText
}
});
me.dropZone.add(text);
me.fireEvent('uploadReady');
},
createDropZoneTemplate: function() {
var me = this;
return new Ext.XTemplate(
'<div class="inner-dropzone">',
'<span class="text">',
'<tpl if="actualQuantity">',
'{actualQuantity} ' + me.snippets.filesFrom + ' {totalQuantity}&nbsp;',
'</tpl>',
'{text}',
'</span>',
'</div>'
);
},
createDropZoneEvents: function () {
var me = this, el = me.dropZone.getEl().dom;
el.addEventListener('dragenter', function (event) {
me.dropZone.getEl().addCls(me.dropZoneOverCls);
event.preventDefault();
event.stopPropagation();
}, false);
el.addEventListener('dragover', function (event) {
event.preventDefault();
event.stopPropagation();
}, false);
el.addEventListener('dragleave', function (event) {
var target = event.target;
if (target && target === el) {
me.dropZone.getEl().removeCls(me.dropZoneOverCls);
}
event.preventDefault();
event.stopPropagation();
}, false);
el.addEventListener('drop', function (event) {
var dropEl = me.dropZone.getEl(), files;
event.preventDefault();
event.stopPropagation();
if (dropEl.hasCls(me.dropZoneOverCls)) {
dropEl.removeCls(me.dropZoneOverCls);
}
dropEl.addCls(me.dropZoneDropCls);
if (event.dataTransfer && event.dataTransfer.files) {
files = event.dataTransfer.files;
}
me.iterateFiles(files);
}, false);
},
createFileInputField: function () {
var me = this, file, el, ret;
var config = Ext.apply(me.inputConfig, me.fileInputConfig);
config.name = me.fileField;
file = me.inputFileCmp = Ext.create('Ext.form.field.File', config);
ret = file;
file.on('afterrender', function () {
el = file.fileInputEl.dom;
if (!me.showLegacyBrowserNotice) {
el.setAttribute('multiple', 'multiple');
el.setAttribute('size', '5');
}
}, me);
if (Ext.isIE || Ext.isSafari) {
me.form = Ext.create('Ext.form.Panel', {
unstyled: true,
layout: 'anchor',
url: me.requestURL,
items: [ file ]
});
ret = me.form;
}
file.on('change', function(field) {
var fileField = field.getEl().down('input[type=file]').dom;
if (Ext.isIE || Ext.isSafari) {
me.form.getForm().submit({
method: 'POST',
success: function() {
me.fireEvent('uploadReady', null);
}
});
return false;
}
Ext.each(fileField.files, function(file) {
var timeout = window.setTimeout(function() {
me.uploadFile(file, 0, null, fileField.files.length);
clearTimeout(timeout);
timeout = null;
}, 10);
});
}, me);
return ret;
},
iterateFiles: function (files) {
var me = this;
if (typeof (files) === 'undefined') {
return false;
}
this.currentFiles = files;
if (me.checkAmount) {
if (files.length > me.maxAmount) {
if (me.maxAmountErrorFunction) {
me.maxAmountErrorFunction.call();
}
return false;
}
}
if (me.enablePreviewImage) {
for (var i = 0, l = files.length; i < l; i++) {
me.createPreviewImage(files[i]);
}
} else {
me.createPreview(files);
}
},
reuploadFiles: function() {
if (!Ext.isDefined(this.currentFiles)) {
return;
}
this.iterateFiles(this.currentFiles);
},
createPreview: function(files) {
var me = this;
if (me.dropZone !== Ext.undefined) {
me.dropZone.removeAll();
var text = Ext.create('Ext.Component', {
renderTpl: me.createDropZoneTemplate(),
tpl: me.createDropZoneTemplate(),
renderData: {
actualQuantity: '0',
totalQuantity: files.length,
text: me.snippets.uploadReady
}
});
text.addClass('small-padding');
var progressBar = me.createProgressBar();
progressBar.update({ percent: 0 });
progressBar.value = 0;
var infoPnl = Ext.create('Ext.panel.Panel', {
ui: 'plain',
cls: me.dropItemCls,
items: [ progressBar ]
});
me.dropZone.add(text);
me.dropZone.add(infoPnl);
}
Ext.each(files, function(file) {
var timeout = window.setTimeout(function() {
me.uploadFile(file, progressBar, text, files.length);
clearTimeout(timeout);
timeout = null;
}, 10);
});
},
createProgressBar: function() {
var me = this;
return Ext.create('Ext.Component', {
cls: me.progressBarCls,
tpl: me.progressBarTpl
});
},
createPreviewImage: function (file) {
var reader = new FileReader(), img, me = this;
reader.onload = (function() {
return function(event) {
var format, progressBar, kbValue, info, infoPnl;
if (me.checkType) {
format = file.type;
format = format.replace(/(.*\/)/i, '');
if (!me.in_array(format, me.validTypes)) {
if (me.validTypeErrorFunction) {
me.validTypeErrorFunction.call();
}
return false;
}
}
if (me.checkSize && me.maxSize < file.size) {
if (me.maxSizeErrorFunction) {
me.maxSizeErrorFunction.call(me, file.size);
}
return false;
}
if (me.initial) {
me.dropZone.removeAll();
me.initial = false;
}
progressBar = me.createProgressBar();
progressBar.update({ percent: 0 });
progressBar.addClass(me.previewEnabledCls);
kbValue = ~~(file.size / 1000);
info = Ext.create('Ext.Component', {
renderTpl: me.dropItemTpl,
columnWidth: 0.7,
renderData: {
infoCls: me.dropItemInfoCls,
name: file.name,
size: kbValue
},
items: [ progressBar ]
});
if ((/image/i).test(file.type)) {
img = Ext.create('Ext.container.Container', {
cls: me.dropItemImageCls,
layout: 'column',
items: [{
xtype: 'image',
columnWidth: 0.3,
src: event.target.result
}, info ]
});
} else {
img = Ext.create('Ext.container.Container', {
cls: me.dropItemImageCls,
layout: 'column',
items: [{
xtype: 'container',
cls: 'ico-package',
columnWidth: 0.3
}, info ]
});
}
infoPnl = Ext.create('Ext.panel.Panel', {
ui: 'plain',
cls: me.dropItemCls,
items: [ img, progressBar ]
});
me.dropZone.add(infoPnl);
me.uploadFile(file, progressBar, infoPnl);
};
}(img));
reader.readAsDataURL(file);
},
uploadFile: function (file, progressBar, infoText, count) {
var xhr = new XMLHttpRequest(),
me = this;
progressBar = progressBar || 0;
infoText = infoText || null;
xhr.open('post', me.requestURL, false);
xhr.addEventListener('load', function(e) {
var target = e.target,
response = Ext.decode(target.responseText);
if (response.success == false && response.blacklist == true) {
Shopware.Notification.createGrowlMessage(me.snippets.blackListTitle, Ext.String.format(me.snippets.blackListMessage, response.extension));
}
if (me.checkSize && me.maxSize < file.size) {
if (me.maxSizeErrorFunction) {
me.maxSizeErrorFunction.call(me, file.size);
}
return false;
}
if (me.enablePreviewImage) {
progressBar.update({ percent: 100 });
} else {
if (Ext.isNumeric(progressBar)) {
progressBar++;
} else {
progressBar.value++;
progressBar.update({ percent: (progressBar.value / count) * 100 });
}
if (infoText) {
infoText.tpl = me.createDropZoneTemplate();
infoText.renderTpl = me.createDropZoneTemplate();
try {
infoText.update({
actualQuantity: progressBar.value,
totalQuantity: count,
text: me.snippets.uploadReady
});
} catch (e) {
}
}
}
if (target.readyState === 4 && target.status === 200) {
try {
me.fireEvent('fileUploaded', target, response);
} catch (e) {
}
}
if (infoText && progressBar.value === count) {
if (me.dropZone !== Ext.undefined) {
me.dropZone.removeAll();
var text = Ext.create('Ext.Component', {
renderTpl: me.createDropZoneTemplate(),
tpl: me.createDropZoneTemplate(),
renderData: {
text: me.dropZoneText
}
});
me.dropZone.add(text);
}
me.fireEvent('uploadReady', target);
if (response.success) {
Shopware.Msg.createGrowlMessage(me.snippets.messageTitle, Ext.String.format(me.snippets.messageText, count), 'Media-Manager');
} else if (response.error) {
Shopware.Msg.createGrowlMessage(
me.snippets.messageTitle,
response.error
);
} else {
if (response.exception && response.exception._class) {
switch(response.exception._class) {
case 'Shopware\\Bundle\\MediaBundle\\Exception\\MediaFileExtensionNotAllowedException':
case 'Shopware\\Bundle\\MediaBundle\\Exception\\MediaFileExtensionIsBlacklistedException':
Ext.Msg.alert(
me.snippets.extensionNotAllowedTitle,
Ext.String.format(me.snippets.extensionNotAllowedText, response.exception.extension)
);
break;
default:
Ext.Msg.alert(me.snippets.maxUploadSizeTitle, me.snippets.maxUploadSizeText);
}
}
me.fireEvent('uploadFailed', response);
}
} else {
me.fireEvent('uploadReady', target);
}
}, false);
xhr.setRequestHeader('X-CSRF-Token', Ext.CSRFService.getToken());
var formData = new FormData();
formData.append(this.fileField, file);
xhr.send(formData);
},
in_array: function(needle, haystack, argStrict) {
var key = '',
strict = !!argStrict;
if (strict) {
for (key in haystack) {
if (haystack[key] === needle) {
return true;
}
}
} else {
for (key in haystack) {
if (haystack[key] == needle) {
return true;
}
}
}
return false;
}
});
Ext.define('Enlight.app.WindowManagement', {
alternateClassName: [ 'Shopware.app.WindowManagement', 'Shopware.WindowManagement' ],
singleton: true,
extend: 'Ext.app.Controller',
requires: [ 'Ext.WindowManager' ],
defaultCls: 'footer-btn',
defaultIconCls: 'closeable',
initial: true,
view: null,
footer: null,
viewport: null,
init: function(footer) {
var me = this;
if(me.initial) {
me.view = Ext.create('Ext.container.Container', {
cls: 'window-management-holder',
autoScroll: true
});
me.footer = footer;
me.viewport = footer.ownerCt;
me.footer.add(me.view);
me.inital = false;
}
footer.on('afterrender', me.onFooterRendered, me);
me.callParent(arguments);
},
addItem: function(text, view) {
var btn, me = this;
if(!me.view) {
return btn;
}
view = view || {};
btn = Ext.create('Ext.button.Button', {
cls: me.defaultCls,
iconCls: me.defaultIconCls,
text: Ext.util.Format.htmlEncode(text || 'Window'),
responsibleView: view,
handler: me.onButtonClick
});
view._toolbarBtn = btn;
me.view.add(btn);
me.setActiveItem(btn);
view.on('destroy', function() {
if(view._toolbarBtn) {
view._toolbarBtn.destroy();
}
}, me);
return btn;
},
setActiveItem: function(btn) {
if(this.view.items.items && this.view.items.items.length > 0) {
Ext.each(this.view.items.items, function(item) {
item.toggle(false, true);
});
}
btn.toggle(true, true);
return btn;
},
removeItem: function(btn) {
this.view.remove(btn, true);
return true;
},
removeAt: function(key) {
this.view.remove(key, true);
return true;
},
getAt: function(key) {
return this.view.items.items[key];
},
getAllItems: function() {
return this.view.items.items;
},
removeAllItems: function() {
this.view.removeAll(true);
return true;
},
onButtonClick: function(btn, e) {
if(!btn.responsibleView) {
return false;
}
var view = btn.responsibleView,
viewport = Shopware.app.Application.viewport,
icn = btn.btnIconEl,
minHeight = icn.getY(),
maxHeight = icn.getY() + icn.getHeight(),
minWidth = icn.getX(),
maxWidth = icn.getX() + icn.getWidth();
if(e.getY() >= minHeight && e.getY() <= maxHeight &&
e.getX() >= minWidth && e.getX() <= maxWidth) {
if(view.closeAction == 'destroy') {
view.destroy();
} else {
view.hide();
}
return false;
}
if(viewport.getActiveDesktop() !== view.desktop) {
viewport.jumpTo(view.desktopPosition);
}
if(view.minimized) {
view.show();
btn.toggle(true, true);
view.minimized = false;
}
var isModal = false;
Ext.each(Ext.WindowManager.zIndexStack, function(item) {
if(item && item.modal && item.modal === true && item.getEl().isVisible()) {
isModal = true;
}
});
if(!isModal) {
Ext.WindowManager.bringToFront(view);
}
Shopware.app.WindowManagement.setActiveItem(btn);
},
onFooterRendered: function(cmp) {
this.viewport = cmp.ownerCt;
},
minimizeAll: function() {
var wins = this.getActiveWindows();
Ext.each(wins, function(win) {
win.minimize();
});
return true;
},
closeAll: function() {
var wins = this.getActiveWindows();
Ext.each(wins, function(win) {
if (win.xtype === 'widget-sidebar-window') {
return true;
}
win.destroy();
});
Shopware.app.WindowManagement.removeAllItems();
return true;
},
stackVertical: function() {
var activeWindows = this.getActiveWindows(),
viewport = Shopware.app.WindowManagement.viewport,
footer = Shopware.app.WindowManagement.footer,
size = viewport.getSize(), count, windowHeight,
footerSize = footer.getSize();
count = activeWindows.length;
windowHeight = (Ext.Element.getViewportHeight() - (footerSize.height * 2)) / count;
Ext.each(activeWindows, function(window, index) {
window.setSize({ width: size.width, height: windowHeight });
window.setPosition(0, windowHeight * index);
});
return true;
},
stackHorizontal: function() {
var activeWindows = this.getActiveWindows(),
viewport = Shopware.app.WindowManagement.viewport,
footer = Shopware.app.WindowManagement.footer,
size = viewport.getSize(), count, windowWidth,
footerSize = footer.getSize();
count = activeWindows.length;
windowWidth = (Ext.Element.getViewportWidth()) / count;
Ext.each(activeWindows, function(window, index) {
window.setSize({ width: windowWidth, height: size.height - (footerSize.height * 2) });
window.setPosition(windowWidth * index, 0);
window.show();
});
return true;
},
getActiveWindows: function () {
var activeWindows = [];
Ext.each(Shopware.app.Application.subApplications.items, function (subApp) {
if(!subApp.windowManager || !subApp.windowManager.hasOwnProperty('zIndexStack')) {
return;
}
Ext.each(subApp.windowManager.zIndexStack, function (item) {
if (typeof item !== 'undefined' && item.$className === 'Ext.window.Window' || item.$className === 'Shopware.apps.Deprecated.view.main.Window' || item.$className === 'Enlight.app.Window' || item.$className === 'Ext.Window' && item.$className !== "Ext.window.MessageBox") {
activeWindows.push(item);
}
if (item.alternateClassName === 'Ext.window.Window' || item.alternateClassName === 'Shopware.apps.Deprecated.view.main.Window' || item.alternateClassName === 'Enlight.app.Window' || item.alternateClassName === 'Ext.Window' && item.$className !== "Ext.window.MessageBox") {
activeWindows.push(item);
}
});
});
return activeWindows;
}
});
Ext.define('Enlight.form.mixin.HelpSupportElements', {
supportText: '',
helpText: '',
helpWidth: null,
helpTitle: null,
helpTooltipDelay: 250,
helpTooltipDismissDelay: 10000,
supportTextEl: null,
helpIconEl: null,
initHelpSupportElements: function () {
var me = this;
if(me.helpText) {
me.createHelp();
}
if(me.supportText) {
me.createSupport();
}
},
createSupport:function () {
var me = this,
row = new Ext.Element(document.createElement('tr')),
fillCell = new Ext.Element(document.createElement('td')),
cell = new Ext.Element(document.createElement('td')),
supportText = new Ext.Element(document.createElement('div'));
supportText.set({
cls: Ext.baseCSSPrefix +'form-support-text'
});
if(me.supportText) {
supportText.update(me.supportText);
}
supportText.appendTo(cell);
var element = me.getEl().select('tbody');
if(element.elements.length > 1) {
element = element.elements[0];
}
if(me.fieldLabel || !me.hideEmptyLabel) {
fillCell.appendTo(row);
}
cell.appendTo(row);
if(me.helpText) {
var tmpCell = new Ext.Element(document.createElement('td'));
tmpCell.appendTo(row);
}
row.appendTo(element);
me.supportTextEl = supportText;
return supportText;
},
createHelp:function () {
var me = this,
helpIcon = new Ext.Element(document.createElement('span')),
row = new Ext.Element(document.createElement('td'));
row.set({ width: 24, valign: 'top' });
helpIcon.set({ cls: Ext.baseCSSPrefix + 'form-help-icon' });
helpIcon.appendTo(row);
Ext.tip.QuickTipManager.register({
target:helpIcon,
cls: Ext.baseCSSPrefix + 'form-tooltip',
title:(me.helpTitle) ? me.helpTitle : '',
text:me.helpText,
width:(me.helpWidth) ? me.helpWidth : 225,
anchorToTarget: true,
anchor: 'right',
anchorSize: {
width: 24,
height: 24
},
defaultAlign: 'tr',
showDelay: me.helpTooltipDelay,
dismissDelay: me.helpTooltipDismissDelay
});
row.appendTo(this.inputRow);
this.helpIconEl = helpIcon;
return helpIcon;
}
});
Ext.define('Enlight.app.SubWindow', {
extend: 'Enlight.app.Window',
alias: 'widget.subwindow',
footerButton: false,
isSubWindow: true
});
Ext.define('Ext.ux.DataView.DragSelector', {
requires: ['Ext.dd.DragTracker', 'Ext.util.Region'],
init: function(dataview) {
this.dataview = dataview;
dataview.mon(dataview, {
beforecontainerclick: this.cancelClick,
scope: this,
render: {
fn: this.onRender,
scope: this,
single: true
}
});
},
reInit: function() {
this.destroy();
this.init(this.dataview);
},
destroy: function() {
if (this.proxy) {
this.proxy.destroy();
this.proxy = null;
}
},
onRender: function() {
this.tracker = Ext.create('Ext.dd.DragTracker', {
dataview: this.dataview,
el: this.dataview.el,
dragSelector: this,
onBeforeStart: this.onBeforeStart,
onStart: this.onStart,
onDrag : this.onDrag,
onEnd  : this.onEnd
});
this.dragRegion = Ext.create('Ext.util.Region');
},
onBeforeStart: function(e) {
return e.target == this.dataview.getEl().dom;
},
onStart: function(e) {
var dragSelector = this.dragSelector,
dataview     = this.dataview;
this.dragging = true;
dragSelector.fillRegions();
dragSelector.getProxy().show();
dataview.getSelectionModel().deselectAll();
},
cancelClick: function() {
return !this.tracker.dragging;
},
onDrag: function(e) {
var dragSelector = this.dragSelector,
selModel     = dragSelector.dataview.getSelectionModel(),
dragRegion   = dragSelector.dragRegion,
bodyRegion   = dragSelector.bodyRegion,
proxy        = dragSelector.getProxy(),
regions      = dragSelector.regions,
length       = regions.length,
startXY   = this.startXY,
currentXY = this.getXY(),
minX      = Math.min(startXY[0], currentXY[0]),
minY      = Math.min(startXY[1], currentXY[1]),
width     = Math.abs(startXY[0] - currentXY[0]),
height    = Math.abs(startXY[1] - currentXY[1]),
region, selected, i;
Ext.apply(dragRegion, {
top: minY,
left: minX,
right: minX + width,
bottom: minY + height
});
dragRegion.constrainTo(bodyRegion);
proxy.setRegion(dragRegion);
for (i = 0; i < length; i++) {
region = regions[i];
selected = dragRegion.intersect(region);
if (selected) {
selModel.select(i, true);
} else {
selModel.deselect(i);
}
}
},
onEnd: Ext.Function.createDelayed(function(e) {
var dataview = this.dataview,
selModel = dataview.getSelectionModel(),
dragSelector = this.dragSelector;
this.dragging = false;
dragSelector.getProxy().hide();
}, 1),
getProxy: function() {
if (!this.proxy) {
this.proxy = this.dataview.getEl().createChild({
tag: 'div',
cls: 'x-view-selector'
});
}
return this.proxy;
},
fillRegions: function() {
var dataview = this.dataview,
regions  = this.regions = [];
dataview.all.each(function(node) {
regions.push(node.getRegion());
});
this.bodyRegion = dataview.getEl().getRegion();
}
});
Ext.define('Ext.ux.DataView.LabelEditor', {
extend: 'Ext.Editor',
alignment: 'tl-tl',
completeOnEnter: true,
cancelOnEsc: true,
shim: false,
autoSize: {
width: 'boundEl',
height: 'field'
},
labelSelector: 'x-editable',
requires: [
'Ext.form.field.Text'
],
constructor: function(config) {
config.field = config.field || Ext.create('Ext.form.field.Text', {
allowBlank: false,
selectOnFocus:true
});
this.callParent([config]);
},
init: function(view) {
this.view = view;
this.mon(view, 'render', this.bindEvents, this);
this.on('complete', this.onSave, this);
},
bindEvents: function() {
this.mon(this.view.getEl(), {
click: {
fn: this.onClick,
scope: this
}
});
},
onClick: function(e, target) {
var me = this,
item, record;
if (Ext.fly(target).hasCls(me.labelSelector) && !me.editing && !e.ctrlKey && !e.shiftKey) {
e.stopEvent();
item = me.view.findItemByChild(target);
record = me.view.store.getAt(me.view.indexOf(item));
me.startEdit(target, record.data[me.dataIndex]);
me.activeRecord = record;
} else if (me.editing) {
me.field.blur();
e.preventDefault();
}
},
onSave: function(ed, value) {
this.activeRecord.set(this.dataIndex, value);
}
});
Ext.define('Ext.ux.form.field.BoxSelect', {
extend:'Ext.form.field.ComboBox',
alias: ['widget.comboboxselect', 'widget.boxselect'],
requires: ['Ext.selection.Model', 'Ext.data.Store'],
multiSelect: true,
forceSelection: true,
selectOnFocus: true,
triggerOnClick: true,
createNewOnEnter: false,
createNewOnBlur: false,
encodeSubmitValue: false,
stacked: false,
pinList: true,
grow: true,
growMin: false,
growMax: false,
componentLayout: 'boxselectfield',
initComponent: function() {
var me = this,
typeAhead = me.typeAhead;
if (typeAhead && !me.editable) {
Ext.Error.raise('If typeAhead is enabled the combo must be editable: true -- please change one of those settings.');
}
Ext.apply(me, {
typeAhead: false
});
me.callParent(arguments);
me.typeAhead = typeAhead;
me.selectionModel = new Ext.selection.Model({
store: me.valueStore,
mode: 'MULTI',
onSelectChange: function(record, isSelected, suppressEvent, commitFn) {
commitFn();
}
});
if (!Ext.isEmpty(me.delimiter) && me.multiSelect) {
me.delimiterEndingRegexp = new RegExp(String(me.delimiter).replace(/[$%()*+.?\[\\\]{|}]/g, "\\$&") + "$");
}
},
initEvents: function() {
var me = this;
me.callParent(arguments);
if (!me.enableKeyEvents) {
me.mon(me.inputEl, 'keydown', me.onKeyDown, me);
}
me.mon(me.itemList, 'click', me.onItemListClick, me);
me.mon(me.selectionModel, 'selectionchange', me.applyMultiselectItemMarkup, me);
},
bindStore: function(store, initial) {
var me = this;
if (me.oldStore) {
me.mun(me.store, 'beforeload', me.onBeforeLoad, me);
if (me.valueStore) {
me.mun(me.valueStore, 'datachanged', me.applyMultiselectItemMarkup, me);
me.valueStore = null;
}
me.oldStore = null;
}
me.oldStore = true;
me.callParent(arguments);
if (me.store) {
if(me.valueStore) {
me.valueStore = Ext.StoreManager.get(me.valueStore);
} else {
me.valueStore = new Ext.data.Store({
model: me.store.model,
proxy: {
type: 'memory'
}
});
}
me.mon(me.valueStore, 'datachanged', me.applyMultiselectItemMarkup, me);
me.mon(me.store, 'beforeload', me.onBeforeLoad, me);
}
},
createPicker: function() {
var me = this,
picker = me.callParent(arguments);
me.mon(picker, {
'beforerefresh': me.onBeforeListRefresh,
'show': function(pick) {
var listEl = picker.listEl,
ch = listEl.getHeight();
if (ch > picker.maxHeight) {
listEl.setHeight(picker.maxHeight);
}
},
scope: me
});
return picker;
},
onDestroy: function() {
var me = this;
Ext.destroyMembers(me, 'selectionModel', 'valueStore');
me.callParent(arguments);
},
afterRender: function() {
var me = this;
if (Ext.supports.Placeholder && me.inputEl && me.emptyText) {
delete me.inputEl.dom.placeholder;
}
if (me.stacked === true) {
me.itemList.addCls('x-boxselect-stacked');
}
if (me.grow) {
if (Ext.isNumber(me.growMin) && (me.growMin > 0)) {
me.itemList.applyStyles('min-height:'+me.growMin+'px');
}
if (Ext.isNumber(me.growMax) && (me.growMax > 0)) {
me.itemList.applyStyles('max-height:'+me.growMax+'px');
}
}
me.applyMultiselectItemMarkup();
me.callParent(arguments);
},
findRecord: function(field, value) {
var ds = this.store,
rec = false,
idx;
if (ds.snapshot) {
idx = ds.snapshot.findIndexBy(function(rec) {
return rec.get(field) === value;
});
rec = (idx !== -1) ? ds.snapshot.getAt(idx) : false;
} else {
idx = ds.findExact(field, value);
rec = (idx !== -1) ? ds.getAt(idx) : false;
}
return rec;
},
onBeforeLoad: function() {
this.ignoreSelection++;
},
onLoad: function() {
var me = this,
valueField = me.valueField,
valueStore = me.valueStore,
changed = false;
if (valueStore) {
if (!Ext.isEmpty(me.value) && (valueStore.getCount() == 0)) {
me.setValue(me.value, false, true);
}
valueStore.suspendEvents();
valueStore.each(function(rec) {
var r = me.findRecord(valueField, rec.get(valueField)),
i = r ? valueStore.indexOf(rec) : -1;
if (i >= 0) {
valueStore.removeAt(i);
valueStore.insert(i, r);
changed = true;
}
});
valueStore.resumeEvents();
if (changed) {
valueStore.fireEvent('datachanged', valueStore);
}
}
me.callParent(arguments);
me.ignoreSelection = Ext.Number.constrain(me.ignoreSelection - 1, 0);
me.alignPicker();
},
isFilteredRecord: function(record) {
var me = this,
store = me.store,
valueField = me.valueField,
storeRecord,
filtered = false;
storeRecord = store.findExact(valueField, record.get(valueField));
filtered = ((storeRecord === -1) && (!store.snapshot || (me.findRecord(valueField, record.get(valueField)) !== false)));
filtered = filtered || (!filtered && (storeRecord === -1) && (me.forceSelection !== true) &&
(me.valueStore.findExact(valueField, record.get(valueField)) >= 0));
return filtered;
},
doRawQuery: function() {
var me = this,
rawValue = me.inputEl.dom.value;
if (me.multiSelect) {
rawValue = rawValue.split(me.delimiter).pop();
}
this.doQuery(rawValue, false, true);
},
onBeforeListRefresh: function() {
this.ignoreSelection++;
},
onListRefresh: function() {
this.callParent(arguments);
this.ignoreSelection = Ext.Number.constrain(this.ignoreSelection - 1, 0);
},
onListSelectionChange: function(list, selectedRecords) {
var me = this,
valueStore = me.valueStore,
mergedRecords = [],
i;
if ((me.ignoreSelection <= 0) && me.isExpanded) {
valueStore.each(function(rec) {
if (Ext.Array.contains(selectedRecords, rec) || me.isFilteredRecord(rec)) {
mergedRecords.push(rec);
}
});
mergedRecords = Ext.Array.merge(mergedRecords, selectedRecords);
i = Ext.Array.intersect(mergedRecords, valueStore.getRange()).length;
if ((i != mergedRecords.length) || (i != me.valueStore.getCount())) {
me.setValue(mergedRecords, false);
if (!me.multiSelect || !me.pinList) {
Ext.defer(me.collapse, 1, me);
}
if (valueStore.getCount() > 0) {
me.fireEvent('select', me, valueStore.getRange());
}
}
me.inputEl.focus();
if (!me.pinList) {
me.inputEl.dom.value = '';
}
if (me.selectOnFocus) {
me.inputEl.dom.select();
}
}
},
syncSelection: function() {
var me = this,
picker = me.picker,
valueField = me.valueField,
pickStore, selection, selModel;
if (picker) {
pickStore = picker.store;
selection = [];
if (me.valueStore) {
me.valueStore.each(function(rec) {
var i = pickStore.findExact(valueField, rec.get(valueField));
if (i >= 0) {
selection.push(pickStore.getAt(i));
}
});
}
me.ignoreSelection++;
selModel = picker.getSelectionModel();
selModel.deselectAll();
if (selection.length > 0) {
selModel.select(selection);
}
me.ignoreSelection = Ext.Number.constrain(me.ignoreSelection - 1, 0);
}
},
alignPicker: function() {
var me = this,
picker, isAbove,
aboveSfx = '-above';
if(me.itemList) {
var itemBox = me.itemList.getBox(false, true);
}
if (this.isExpanded) {
picker = me.getPicker();
var pickerScrollPos = picker.getTargetEl().dom.scrollTop;
if (me.matchFieldWidth) {
picker.setSize(itemBox.width, picker.store && picker.store.getCount() ? null : 0);
}
if (picker.isFloating()) {
picker.alignTo(me.itemList, me.pickerAlign, me.pickerOffset);
isAbove = picker.el.getY() < me.inputEl.getY();
me.bodyEl[isAbove ? 'addCls' : 'removeCls'](me.openCls + aboveSfx);
picker.el[isAbove ? 'addCls' : 'removeCls'](picker.baseCls + aboveSfx);
}
}
},
getCursorPosition: function() {
var cursorPos;
if (Ext.isIE) {
cursorPos = document.selection.createRange();
cursorPos.collapse(true);
cursorPos.moveStart("character", -this.inputEl.dom.value.length);
cursorPos = cursorPos.text.length;
} else {
cursorPos = this.inputEl.dom.selectionStart;
}
return cursorPos;
},
hasSelectedText: function() {
var sel, range;
if (Ext.isIE) {
sel = document.selection;
range = sel.createRange();
return (range.parentElement() == this.inputEl.dom);
} else {
return this.inputEl.dom.selectionStart != this.inputEl.dom.selectionEnd;
}
},
onKeyDown: function(e, t) {
var me = this,
key = e.getKey(),
rawValue = me.inputEl.dom.value,
valueStore = me.valueStore,
selModel = me.selectionModel,
stopEvent = false,
rec, i;
if (me.readOnly || me.disabled || !me.editable) {
return;
}
if ((valueStore.getCount() > 0) &&
((rawValue == '') || ((me.getCursorPosition() === 0) && !me.hasSelectedText()))) {
if ((key == e.BACKSPACE) || (key == e.DELETE)) {
if (selModel.getCount() > 0) {
me.valueStore.remove(selModel.getSelection());
} else {
me.valueStore.remove(me.valueStore.last());
}
me.setValue(me.valueStore.getRange());
selModel.deselectAll();
stopEvent = true;
} else if ((key == e.RIGHT) || (key == e.LEFT)) {
if ((selModel.getCount() === 0) && (key == e.LEFT)) {
selModel.select(valueStore.last());
stopEvent = true;
} else if (selModel.getCount() > 0) {
rec = selModel.getLastFocused() || selModel.getLastSelected();
if (rec) {
i = valueStore.indexOf(rec);
if (key == e.RIGHT) {
if (i < (valueStore.getCount() - 1)) {
selModel.select(i + 1, e.shiftKey);
stopEvent = true;
} else if (!e.shiftKey) {
selModel.deselect(rec);
stopEvent = true;
}
} else if ((key == e.LEFT) && (i > 0)) {
selModel.select(i - 1, e.shiftKey);
stopEvent = true;
}
}
}
} else if (key == e.A && e.ctrlKey) {
selModel.selectAll();
stopEvent = e.A;
}
me.inputEl.focus();
}
if (stopEvent) {
me.preventKeyUpEvent = stopEvent;
e.stopEvent();
return;
}
if (me.isExpanded && (key == e.ENTER) && me.picker.highlightedItem) {
me.preventKeyUpEvent = true;
}
if (me.enableKeyEvents) {
me.callParent(arguments);
}
if (!e.isSpecialKey() && !e.hasModifier()) {
me.selectionModel.deselectAll();
me.inputEl.focus();
}
},
onKeyUp: function(e, t) {
var me = this,
rawValue = me.inputEl.dom.value,
rec;
if (me.preventKeyUpEvent) {
e.stopEvent();
if ((me.preventKeyUpEvent === true) || (e.getKey() === me.preventKeyUpEvent)) {
delete me.preventKeyUpEvent;
}
return;
}
if (me.multiSelect && (me.delimiterEndingRegexp && me.delimiterEndingRegexp.test(rawValue)) ||
((me.createNewOnEnter === true) && e.getKey() == e.ENTER)) {
rawValue = rawValue.replace(me.delimiterEndingRegexp, '');
if (!Ext.isEmpty(rawValue)) {
rec = me.valueStore.findExact(me.valueField, rawValue);
if (rec >= 0) {
rec = me.valueStore.getAt(rec);
} else {
rec = me.store.findExact(me.valueField, rawValue);
if (rec >= 0) {
rec = me.store.getAt(rec);
} else {
rec = false;
}
}
if (!rec && !me.forceSelection) {
rec = {};
rec[me.valueField] = rawValue;
rec[me.displayField] = rawValue;
rec = new me.valueStore.model(rec);
}
if (rec) {
me.collapse();
me.setValue(me.valueStore.getRange().concat(rec));
me.inputEl.dom.value = '';
me.inputEl.focus();
}
}
}
me.callParent([e,t]);
Ext.Function.defer(me.alignPicker, 10, me);
},
onTypeAhead: function() {
var me = this,
displayField = me.displayField,
inputElDom = me.inputEl.dom,
record = me.store.findRecord(displayField, inputElDom.value),
boundList = me.getPicker(),
newValue, len, selStart;
if (record) {
newValue = record.get(displayField);
len = newValue.length;
selStart = inputElDom.value.length;
boundList.highlightItem(boundList.getNode(record));
if (selStart !== 0 && selStart !== len) {
inputElDom.value = newValue;
me.selectText(selStart, newValue.length);
}
}
},
onItemListClick: function(evt, el, o) {
var me = this,
itemEl = evt.getTarget('.x-boxselect-item'),
closeEl = itemEl ? evt.getTarget('.x-boxselect-item-close') : false;
if (me.readOnly || me.disabled) {
return;
}
evt.stopPropagation();
if (itemEl) {
if (closeEl) {
me.removeByListItemNode(itemEl);
} else {
me.toggleSelectionByListItemNode(itemEl, evt.shiftKey);
}
me.inputEl.focus();
} else if (me.triggerOnClick) {
me.onTriggerClick();
}
},
getMultiSelectItemMarkup: function() {
var me = this;
if (!me.multiSelectItemTpl) {
if (!me.labelTpl) {
me.labelTpl = Ext.create('Ext.XTemplate',
'{[values.' + me.displayField + ']}'
);
} else if (Ext.isString(me.labelTpl)) {
me.labelTpl = Ext.create('Ext.XTemplate', me.labelTpl);
}
me.multiSelectItemTpl = [
'<tpl for=".">',
'<li class="x-boxselect-item ',
'<tpl if="this.isSelected(values.'+ me.valueField + ')">',
' selected',
'</tpl>',
'" qtip="{[typeof values === "string" ? values : values.' + me.displayField + ']}">' ,
'<div class="x-boxselect-item-text">{[typeof values === "string" ? values : this.getItemLabel(values)]}</div>',
'<div class="x-tab-close-btn x-boxselect-item-close"></div>' ,
'</li>' ,
'</tpl>',
{
compile: true,
disableFormats: true,
isSelected: function(value) {
var i = me.valueStore.findExact(me.valueField, value);
if (i >= 0) {
return me.selectionModel.isSelected(me.valueStore.getAt(i));
}
},
getItemLabel: function(values) {
return me.getTpl('labelTpl').apply(values);
}
}
];
}
return this.getTpl('multiSelectItemTpl').apply(Ext.Array.pluck(this.valueStore.getRange(), 'data'));
},
applyMultiselectItemMarkup: function() {
var me = this,
itemList = me.itemList,
item;
if (itemList) {
while ((item = me.inputElCt.prev()) != null) {
item.remove();
}
me.inputElCt.insertHtml('beforeBegin', me.getMultiSelectItemMarkup());
}
},
getRecordByListItemNode: function(itemEl) {
var me = this,
itemIdx = 0,
searchEl = me.itemList.dom.firstChild;
while (searchEl && searchEl.nextSibling) {
if (searchEl == itemEl) {
break;
}
itemIdx++;
searchEl = searchEl.nextSibling;
}
itemIdx = (searchEl == itemEl) ? itemIdx : false;
if (itemIdx === false) {
return false;
}
return me.valueStore.getAt(itemIdx);
},
toggleSelectionByListItemNode: function(itemEl, keepExisting) {
var me = this,
rec = me.getRecordByListItemNode(itemEl);
if (rec) {
if (me.selectionModel.isSelected(rec)) {
me.selectionModel.deselect(rec);
} else {
me.selectionModel.select(rec, keepExisting);
}
}
},
removeByListItemNode: function(itemEl) {
var me = this,
rec = me.getRecordByListItemNode(itemEl);
if (rec) {
me.valueStore.remove(rec);
me.setValue(me.valueStore.getRange());
}
},
getRawValue: function() {
var me = this,
inputEl = me.inputEl,
result;
me.inputEl = false;
result = me.callParent(arguments);
me.inputEl = inputEl;
return result;
},
setRawValue: function(value) {
var me = this,
inputEl = me.inputEl,
result;
me.inputEl = false;
result = me.callParent([value]);
me.inputEl = inputEl;
return result;
},
addValue: function(valueMixed) {
var me = this;
if (valueMixed) {
me.setValue(Ext.Array.merge(me.value, Ext.Array.from(valueMixed)));
}
},
removeValue: function(valueMixed) {
var me = this;
if (valueMixed) {
me.setValue(Ext.Array.difference(me.value, Ext.Array.from(valueMixed)));
}
},
setValue: function(value, doSelect, skipLoad) {
var me = this,
valueStore = me.valueStore,
valueField = me.valueField,
record, len, i, valueRecord, h,
unknownValues = [];
if (Ext.isEmpty(value)) {
value = null;
}
if (Ext.isString(value) && me.multiSelect) {
value = value.split(me.delimiter);
}
value = Ext.Array.from(value);
for (i = 0, len = value.length; i < len; i++) {
record = value[i];
if (!record || !record.isModel) {
valueRecord = valueStore.findExact(valueField, record);
if (valueRecord >= 0) {
value[i] = valueStore.getAt(valueRecord);
} else {
valueRecord = me.findRecord(valueField, record);
if (!valueRecord) {
if (me.forceSelection) {
unknownValues.push(record);
} else {
valueRecord = {};
valueRecord[me.valueField] = record;
valueRecord[me.displayField] = record;
valueRecord = new me.valueStore.model(valueRecord);
}
}
if (valueRecord) {
value[i] = valueRecord;
}
}
}
}
if ((skipLoad !== true) && (unknownValues.length > 0) && (me.queryMode === 'remote')) {
var params = {};
params[me.valueField] = unknownValues.join(me.delimiter);
me.store.load({
params: params,
callback: function() {
if(me.itemList) {
me.itemList.unmask();
}
me.setValue(value, doSelect, true);
me.autoSize();
}
});
return false;
}
if (!me.multiSelect && (value.length > 0)) {
value = value[value.length - 1];
}
me.callParent([value, doSelect]);
},
getValueRecords: function() {
return this.valueStore.getRange();
},
getSubmitData: function() {
var me = this,
val = me.callParent(arguments);
if (me.multiSelect && me.encodeSubmitValue && val && val[me.name]) {
val[me.name] = Ext.encode(val[me.name]);
}
return val;
},
beforeBlur: function() {
var me = this;
me.doQueryTask.cancel();
me.assertValue();
me.collapse();
},
mimicBlur: function() {
var me = this;
if (me.selectOnTab && me.picker && me.picker.highlightedItem) {
me.inputEl.dom.value = '';
}
me.callParent(arguments);
},
assertValue: function() {
var me = this,
rawValue = me.inputEl.dom.value,
rec = !Ext.isEmpty(rawValue) ? me.findRecordByDisplay(rawValue) : false,
value = false;
if (!rec && !me.forceSelection && me.createNewOnBlur && !Ext.isEmpty(rawValue)) {
value = rawValue;
} else if (rec) {
value = rec;
}
if (value) {
me.addValue(value);
}
me.inputEl.dom.value = '';
me.collapse();
},
checkChange: function() {
if (!this.suspendCheckChange && !this.isDestroyed) {
var me = this,
valueStore = me.valueStore,
lastValue = me.lastValue,
valueField = me.valueField,
newValue = Ext.Array.map(Ext.Array.from(me.value), function(val) {
if (val.isModel) {
return val.get(valueField);
}
return val;
}, this).join(this.delimiter);
if (!me.isEqual(newValue, lastValue)) {
valueStore.suspendEvents();
valueStore.removeAll();
if (Ext.isArray(me.valueModels)) {
valueStore.add(me.valueModels);
}
valueStore.resumeEvents();
valueStore.fireEvent('datachanged', valueStore);
me.lastValue = newValue;
me.fireEvent('change', me, newValue, lastValue);
me.onChange(newValue, lastValue)
}
}
},
applyEmptyText : function() {
var me = this,
emptyText = me.emptyText,
inputEl, isEmpty;
if (me.rendered && emptyText) {
isEmpty = Ext.isEmpty(me.value) && !me.hasFocus;
inputEl = me.inputEl;
if (isEmpty) {
inputEl.dom.value = emptyText;
inputEl.addCls(me.emptyCls);
} else {
if (inputEl.dom.value === emptyText) {
inputEl.dom.value = '';
}
inputEl.removeCls(me.emptyCls);
}
}
},
preFocus : function(){
var me = this,
inputEl = me.inputEl,
emptyText = me.emptyText,
isEmpty;
if (emptyText && inputEl.dom.value === emptyText) {
inputEl.dom.value = '';
isEmpty = true;
inputEl.removeCls(me.emptyCls);
}
if (me.selectOnFocus || isEmpty) {
inputEl.dom.select();
}
},
onFocus: function() {
var me = this,
focusCls = me.focusCls,
itemList = me.itemList;
if (focusCls && itemList) {
itemList.addCls(focusCls);
}
me.callParent(arguments);
},
onBlur: function() {
var me = this,
focusCls = me.focusCls,
itemList = me.itemList;
if (focusCls && itemList) {
itemList.removeCls(focusCls);
}
me.callParent(arguments);
},
renderActiveError: function() {
var me = this,
invalidCls = me.invalidCls,
itemList = me.itemList,
hasError = me.hasActiveError();
if (invalidCls && itemList) {
itemList[hasError ? 'addCls' : 'removeCls'](me.invalidCls + '-field');
}
me.callParent(arguments);
},
autoSize: function() {
var me = this,
height;
if (me.rendered) {
me.doComponentLayout();
if (me.grow) {
height = me.getHeight();
if (height !== me.lastInputHeight) {
me.alignPicker();
me.fireEvent('autosize', height);
me.lastInputHeight = height;
}
}
}
return me;
}
}, function() {
var useNewSelectors = !Ext.getVersion('extjs').isLessThan('4.0.5'),
overrides = {};
if (useNewSelectors) {
Ext.apply(overrides, {
fieldSubTpl: [
'<div class="x-boxselect">',
'<ul id="{cmpId}-itemList" class="x-boxselect-list {fieldCls} {typeCls}">',
'<li id="{cmpId}-inputElCt" class="x-boxselect-input">',
'<input id="{cmpId}-inputEl" type="{type}" ',
'<tpl if="name">name="{name}" </tpl>',
'<tpl if="size">size="{size}" </tpl>',
'<tpl if="tabIdx">tabIndex="{tabIdx}" </tpl>',
'class="x-boxselect-input-field" autocomplete="off" />',
'</li>',
'</ul>',
'<div id="{cmpId}-triggerWrap" class="{triggerWrapCls}" role="presentation">',
'{triggerEl}',
'<div class="{clearCls}" role="presentation"></div>',
'</div>',
'<div class="{clearCls}" role="presentation"></div>',
'</div>',
{
compiled: true,
disableFormats: true
}
],
childEls: ['itemList', 'inputEl', 'inputElCt']
});
} else {
Ext.apply(overrides, {
fieldSubTpl: [
'<div class="x-boxselect">',
'<ul class="x-boxselect-list {fieldCls} {typeCls}">',
'<li class="x-boxselect-input">',
'<input id="{id}" type="{type}" ',
'<tpl if="name">name="{name}" </tpl>',
'<tpl if="size">size="{size}" </tpl>',
'<tpl if="tabIdx">tabIndex="{tabIdx}" </tpl>',
'class="x-boxselect-input-field" autocomplete="off" />',
'</li>',
'</ul>',
'<div class="{triggerWrapCls}" role="presentation">',
'{triggerEl}',
'<div class="{clearCls}" role="presentation"></div>',
'</div>',
'</div>',
{
compiled: true,
disableFormats: true
}
],
renderSelectors: {
itemList: 'ul.x-boxselect-list',
inputEl: 'input.x-boxselect-input-field',
inputElCt: 'li.x-boxselect-input'
}
});
}
Ext.override(this, overrides);
});
Ext.define('Ext.ux.layout.component.field.BoxSelectField', {
alias: ['layout.boxselectfield'],
extend: 'Ext.layout.component.field.Field',
type: 'boxselectfield',
beforeLayout: function(width, height) {
var me = this,
owner = me.owner,
lastValue = this.lastValue,
value = Ext.encode(owner.value);
this.lastValue = value;
return me.callParent(arguments) || (owner.grow && value !== lastValue);
},
sizeBodyContents: function(width, height) {
var me = this,
owner = me.owner,
triggerWrap = owner.triggerWrap,
triggerWidth = owner.getTriggerWidth(),
itemList, inputEl, inputElCt, lastEntry,
listBox, listWidth, inputWidth;
if (owner.hideTrigger || owner.readOnly || triggerWidth > 0) {
itemList = owner.itemList;
me.setElementSize(itemList, Ext.isNumber(width) ? width - triggerWidth : width, height);
triggerWrap.setWidth(triggerWidth);
inputEl = owner.inputEl;
inputElCt = owner.inputElCt;
listBox = itemList.getBox(true, true);
listWidth = listBox.width;
if ((owner.grow && owner.growMax && (itemList.dom.scrollHeight > (owner.growMax - 25))) ||
(owner.isFixedHeight() && (itemList.dom.scrollHeight > itemList.dom.clientHeight))) {
listWidth = listWidth - Ext.getScrollbarSize().width;
}
inputWidth = listWidth - 10;
lastEntry = inputElCt.dom.previousSibling;
if (lastEntry) {
inputWidth = inputWidth - (lastEntry.offsetLeft + Ext.fly(lastEntry).getWidth() + Ext.fly(lastEntry).getPadding('lr'));
}
if (inputWidth < 35) {
inputWidth = listWidth - 10;
}
if (inputWidth >= 0) {
me.setElementSize(inputEl, inputWidth);
if (owner.hasFocus) {
inputElCt.scrollIntoView(itemList);
}
}
}
}
});
Ext.define('Ext.ux.RowExpander', {
extend: 'Ext.AbstractPlugin',
requires: [
'Ext.grid.feature.RowBody',
'Ext.grid.feature.RowWrap'
],
alias: 'plugin.rowexpander',
rowBodyTpl: null,
expandOnEnter: true,
expandOnDblClick: true,
selectRowOnExpand: false,
rowBodyTrSelector: '.x-grid-rowbody-tr',
rowBodyHiddenCls: 'x-grid-row-body-hidden',
rowCollapsedCls: 'x-grid-row-collapsed',
rowsExpanded: new Ext.util.MixedCollection(),
renderer: function(value, metadata, record, rowIdx, colIdx) {
if (colIdx === 0) {
metadata.tdCls = 'x-grid-td-expander';
}
return '<div class="x-grid-row-expander">&#160;</div>';
},
constructor: function() {
this.callParent(arguments);
var grid = this.getCmp();
this.recordsExpanded = {};
if (!this.rowBodyTpl) {
Ext.Error.raise("The 'rowBodyTpl' config is required and is not defined.");
}
var rowBodyTpl = Ext.create('Ext.XTemplate', this.rowBodyTpl),
features = [{
ftype: 'rowbody',
columnId: this.getHeaderId(),
recordsExpanded: this.recordsExpanded,
rowBodyHiddenCls: this.rowBodyHiddenCls,
rowCollapsedCls: this.rowCollapsedCls,
getAdditionalData: this.getRowBodyFeatureData,
getRowBodyContents: function(data) {
return rowBodyTpl.applyTemplate(data);
}
},{
ftype: 'rowwrap'
}];
if (grid.features) {
grid.features = features.concat(grid.features);
} else {
grid.features = features;
}
},
init: function(grid) {
this.callParent(arguments);
grid.headerCt.insert(0, this.getHeaderConfig());
grid.on('render', this.bindView, this, { single: true });
},
getHeaderId: function() {
if (!this.headerId) {
this.headerId = Ext.id();
}
return this.headerId;
},
getRowBodyFeatureData: function(data, idx, record, orig) {
var o = Ext.grid.feature.RowBody.prototype.getAdditionalData.apply(this, arguments),
id = this.columnId;
o.rowBodyColspan = o.rowBodyColspan - 1;
o.rowBody = this.getRowBodyContents(data);
o.rowCls = this.recordsExpanded[record.internalId] ? '' : this.rowCollapsedCls;
o.rowBodyCls = this.recordsExpanded[record.internalId] ? '' : this.rowBodyHiddenCls;
o[id + '-tdAttr'] = ' valign="top" rowspan="2" ';
if (orig[id+'-tdAttr']) {
o[id+'-tdAttr'] += orig[id+'-tdAttr'];
}
return o;
},
bindView: function() {
var view = this.getCmp().getView(),
viewEl;
if (!view.rendered) {
view.on('render', this.bindView, this, { single: true });
} else {
viewEl = view.getEl();
if (this.expandOnEnter) {
this.keyNav = Ext.create('Ext.KeyNav', viewEl, {
'enter' : this.onEnter,
scope: this
});
}
if (this.expandOnDblClick) {
view.on('itemdblclick', this.onDblClick, this);
}
this.view = view;
}
},
onEnter: function(e) {
var view = this.view,
ds   = view.store,
sm   = view.getSelectionModel(),
sels = sm.getSelection(),
ln   = sels.length,
i = 0,
rowIdx;
for (; i < ln; i++) {
rowIdx = ds.indexOf(sels[i]);
this.toggleRow(rowIdx);
}
},
toggleRow: function(rowIdx) {
var rowNode = this.view.getNode(rowIdx),
row = Ext.get(rowNode),
nextBd = Ext.get(row).down(this.rowBodyTrSelector),
record = this.view.getRecord(rowNode),
grid = this.getCmp();
if (row.hasCls(this.rowCollapsedCls)) {
row.removeCls(this.rowCollapsedCls);
nextBd.removeCls(this.rowBodyHiddenCls);
this.rowsExpanded.add(rowIdx.id, rowIdx);
this.recordsExpanded[record.internalId] = true;
this.view.fireEvent('expandbody', rowNode, record, nextBd.dom);
} else {
row.addCls(this.rowCollapsedCls);
nextBd.addCls(this.rowBodyHiddenCls);
this.rowsExpanded.removeAtKey(rowIdx.id);
this.recordsExpanded[record.internalId] = false;
this.view.fireEvent('collapsebody', rowNode, record, nextBd.dom);
}
},
collapseAll: function() {
var me = this;
if (me.rowsExpanded.length === 0) {
return;
}
me.rowsExpanded.each(function(item) {
var rowNode = me.view.getNode(item),
row = Ext.get(rowNode),
nextBd = Ext.get(row).down(me.rowBodyTrSelector),
record = me.view.getRecord(rowNode);
row.addCls(me.rowCollapsedCls);
nextBd.addCls(me.rowBodyHiddenCls);
if (record !== Ext.undefined) {
me.recordsExpanded[record.internalId] = false;
me.view.fireEvent('collapsebody', rowNode, record, nextBd.dom);
}
});
me.rowsExpanded.clear();
},
onDblClick: function(view, cell, rowIdx, cellIndex, e) {
this.toggleRow(rowIdx);
},
getHeaderConfig: function() {
var me                = this,
toggleRow         = Ext.Function.bind(me.toggleRow, me),
selectRowOnExpand = me.selectRowOnExpand;
return {
id: this.getHeaderId(),
width: 24,
sortable: false,
resizable: false,
draggable: false,
hideable: false,
menuDisabled: true,
cls: Ext.baseCSSPrefix + 'grid-header-special',
renderer: function(value, metadata) {
metadata.tdCls = Ext.baseCSSPrefix + 'grid-cell-special';
return '<div class="' + Ext.baseCSSPrefix + 'grid-row-expander">&#160;</div>';
},
processEvent: function(type, view, cell, recordIndex, cellIndex, e) {
if (type == "mousedown" && e.getTarget('.x-grid-row-expander')) {
var row = e.getTarget('.x-grid-row');
toggleRow(row);
return selectRowOnExpand;
}
}
};
}
});
Ext.define('Ext.ux.form.MultiSelect', {
extend: 'Ext.form.FieldContainer',
mixins: {
bindable: 'Ext.util.Bindable',
field: 'Ext.form.field.Field'
},
alternateClassName: 'Ext.ux.Multiselect',
alias: ['widget.multiselectfield', 'widget.multiselect'],
requires: ['Ext.panel.Panel', 'Ext.view.BoundList'],
uses: ['Ext.view.DragZone', 'Ext.view.DropZone'],
ddReorder: false,
appendOnly: false,
displayField: 'text',
allowBlank: true,
minSelections: 0,
layout: 'fit',
maxSelections: Number.MAX_VALUE,
blankText: 'This field is required',
minSelectionsText: 'Minimum {0} item(s) required',
maxSelectionsText: 'Minimum {0} item(s) required',
delimiter: ',',
ignoreSelectChange: 0,
initComponent: function(){
var me = this;
me.bindStore(me.store, true);
if (me.store.autoCreated) {
me.valueField = me.displayField = 'field1';
if (!me.store.expanded) {
me.displayField = 'field2';
}
}
if (!Ext.isDefined(me.valueField)) {
me.valueField = me.displayField;
}
Ext.apply(me, me.setupItems());
me.callParent();
me.initField();
me.addEvents('drop');
},
setupItems: function() {
var me = this;
me.boundList = Ext.create('Ext.view.BoundList', {
deferInitialRefresh: false,
multiSelect: true,
store: me.store,
height: me.listHeight,
overflowY:'auto',
displayField: me.displayField,
disabled: me.disabled,
border: 0
});
me.boundList.getSelectionModel().on('selectionchange', me.onSelectChange, me);
return {
tbar: me.tbar,
items: [{
xtype: 'panel',
dockedItems: me.dockedItems,
title: me.listTitle,
items: me.boundList
}]
};
},
onSelectChange: function(selModel, selections){
if (!this.ignoreSelectChange) {
this.setValue(selections);
}
},
getSelected: function(){
return this.boundList.getSelectionModel().getSelection();
},
isEqual: function(v1, v2) {
var fromArray = Ext.Array.from,
i = 0,
len;
v1 = fromArray(v1);
v2 = fromArray(v2);
len = v1.length;
if (len !== v2.length) {
return false;
}
for(; i < len; i++) {
if (v2[i] !== v1[i]) {
return false;
}
}
return true;
},
afterRender: function(){
var me = this;
me.callParent();
if (me.selectOnRender) {
++me.ignoreSelectChange;
me.boundList.getSelectionModel().select(me.getRecordsForValue(me.value));
--me.ignoreSelectChange;
delete me.toSelect;
}
if (me.ddReorder && !me.dragGroup && !me.dropGroup){
me.dragGroup = me.dropGroup = 'MultiselectDD-' + Ext.id();
}
if (me.draggable || me.dragGroup){
me.dragZone = Ext.create('Ext.view.DragZone', {
view: me.boundList,
ddGroup: me.dragGroup,
dragText: '{0} Item{1}'
});
}
if (me.droppable || me.dropGroup){
me.dropZone = Ext.create('Ext.view.DropZone', {
view: me.boundList,
ddGroup: me.dropGroup,
handleNodeDrop: function(data, dropRecord, position) {
var view = this.view,
store = view.getStore(),
records = data.records,
index;
data.view.store.remove(records);
index = store.indexOf(dropRecord);
if (position === 'after') {
index++;
}
store.insert(index, records);
view.getSelectionModel().select(records);
me.fireEvent('drop', me, records);
}
});
}
},
isValid : function() {
var me = this,
disabled = me.disabled,
validate = me.forceValidation || !disabled;
return validate ? me.validateValue(me.value) : disabled;
},
validateValue: function(value) {
var me = this,
errors = me.getErrors(value),
isValid = Ext.isEmpty(errors);
if (!me.preventMark) {
if (isValid) {
me.clearInvalid();
} else {
me.markInvalid(errors);
}
}
return isValid;
},
markInvalid : function(errors) {
var me = this,
oldMsg = me.getActiveError();
me.setActiveErrors(Ext.Array.from(errors));
if (oldMsg !== me.getActiveError()) {
me.updateLayout();
}
},
clearInvalid : function() {
var me = this,
hadError = me.hasActiveError();
me.unsetActiveError();
if (hadError) {
me.updateLayout();
}
},
getSubmitData: function() {
var me = this,
data = null,
val;
if (!me.disabled && me.submitValue && !me.isFileUpload()) {
val = me.getSubmitValue();
if (val !== null) {
data = {};
data[me.getName()] = val;
}
}
return data;
},
getSubmitValue: function() {
var me = this,
delimiter = me.delimiter,
val = me.getValue();
return Ext.isString(delimiter) ? val.join(delimiter) : val;
},
getValue: function(){
return this.value;
},
getRecordsForValue: function(value){
var me = this,
records = [],
all = me.store.getRange(),
valueField = me.valueField,
i = 0,
allLen = all.length,
rec,
j,
valueLen;
for (valueLen = value.length; i < valueLen; ++i) {
for (j = 0; j < allLen; ++j) {
rec = all[j];
if (rec.get(valueField) == value[i]) {
records.push(rec);
}
}
}
return records;
},
setupValue: function(value){
var delimiter = this.delimiter,
valueField = this.valueField,
i = 0,
out,
len,
item;
if (Ext.isDefined(value)) {
if (delimiter && Ext.isString(value)) {
value = value.split(delimiter);
} else if (!Ext.isArray(value)) {
value = [value];
}
for (len = value.length; i < len; ++i) {
item = value[i];
if (item && item.isModel) {
value[i] = item.get(valueField);
}
}
out = Ext.Array.unique(value);
} else {
out = [];
}
return out;
},
setValue: function(value){
var me = this,
selModel = me.boundList.getSelectionModel();
value = me.setupValue(value);
me.mixins.field.setValue.call(me, value);
if (me.rendered) {
++me.ignoreSelectChange;
selModel.deselectAll();
selModel.select(me.getRecordsForValue(value));
--me.ignoreSelectChange;
} else {
me.selectOnRender = true;
}
},
clearValue: function(){
this.setValue([]);
},
onEnable: function(){
var list = this.boundList;
this.callParent();
if (list) {
list.enable();
}
},
onDisable: function(){
var list = this.boundList;
this.callParent();
if (list) {
list.disable();
}
},
getErrors : function(value) {
var me = this,
format = Ext.String.format,
errors = [],
numSelected;
value = Ext.Array.from(value || me.getValue());
numSelected = value.length;
if (!me.allowBlank && numSelected < 1) {
errors.push(me.blankText);
}
if (numSelected < me.minSelections) {
errors.push(format(me.minSelectionsText, me.minSelections));
}
if (numSelected > me.maxSelections) {
errors.push(format(me.maxSelectionsText, me.maxSelections));
}
return errors;
},
onDestroy: function(){
var me = this;
me.bindStore(null);
Ext.destroy(me.dragZone, me.dropZone);
me.callParent();
},
onBindStore: function(store){
var boundList = this.boundList;
if (boundList) {
boundList.bindStore(store);
}
}
});
Ext.define('Ext.ux.form.ItemSelector', {
extend: 'Ext.ux.form.MultiSelect',
alias: ['widget.itemselectorfield', 'widget.itemselector'],
alternateClassName: ['Ext.ux.ItemSelector'],
requires: [
'Ext.button.Button',
'Ext.ux.form.MultiSelect'
],
hideNavIcons:false,
buttons: ['top', 'up', 'add', 'remove', 'down', 'bottom'],
buttonsText: {
top: "Move to Top",
up: "Move Up",
add: "Add to Selected",
remove: "Remove from Selected",
down: "Move Down",
bottom: "Move to Bottom"
},
initComponent: function() {
var me = this;
me.ddGroup = me.id + '-dd';
me.callParent();
me.bindStore(me.store);
},
createList: function(){
var me = this;
return Ext.create('Ext.ux.form.MultiSelect', {
submitValue: false,
flex: 1,
dragGroup: me.ddGroup,
dropGroup: me.ddGroup,
store: {
model: me.store.model,
data: []
},
displayField: me.displayField,
disabled: me.disabled,
listeners: {
boundList: {
scope: me,
itemdblclick: me.onItemDblClick,
drop: me.syncValue
}
}
});
},
setupItems: function() {
var me = this;
me.fromField = me.createList();
me.toField = me.createList();
return {
layout: {
type: 'hbox',
align: 'stretch'
},
items: [
me.fromField,
{
xtype: 'container',
margins: '0 4',
width: 22,
layout: {
type: 'vbox',
pack: 'center'
},
items: me.createButtons()
},
me.toField
]
};
},
createButtons: function(){
var me = this,
buttons = [];
if (!me.hideNavIcons) {
Ext.Array.forEach(me.buttons, function(name) {
buttons.push({
xtype: 'button',
tooltip: me.buttonsText[name],
handler: me['on' + Ext.String.capitalize(name) + 'BtnClick'],
cls: Ext.baseCSSPrefix + 'form-itemselector-btn',
iconCls: Ext.baseCSSPrefix + 'form-itemselector-' + name,
navBtn: true,
scope: me,
margin: '4 0 0 0'
});
});
}
return buttons;
},
getSelections: function(list){
var store = list.getStore(),
selections = list.getSelectionModel().getSelection();
return Ext.Array.sort(selections, function(a, b){
a = store.indexOf(a);
b = store.indexOf(b);
if (a < b) {
return -1;
} else if (a > b) {
return 1;
}
return 0;
});
},
onTopBtnClick : function() {
var list = this.toField.boundList,
store = list.getStore(),
selected = this.getSelections(list);
store.suspendEvents();
store.remove(selected, true);
store.insert(0, selected);
store.resumeEvents();
list.refresh();
this.syncValue();
list.getSelectionModel().select(selected);
},
onBottomBtnClick : function() {
var list = this.toField.boundList,
store = list.getStore(),
selected = this.getSelections(list);
store.suspendEvents();
store.remove(selected, true);
store.add(selected);
store.resumeEvents();
list.refresh();
this.syncValue();
list.getSelectionModel().select(selected);
},
onUpBtnClick : function() {
var list = this.toField.boundList,
store = list.getStore(),
selected = this.getSelections(list),
i = 0,
len = selected.length,
index = store.getCount();
for (; i < len; ++i) {
index = Math.min(index, store.indexOf(selected[i]));
}
if (index > 0) {
store.suspendEvents();
store.remove(selected, true);
store.insert(index - 1, selected);
store.resumeEvents();
list.refresh();
this.syncValue();
list.getSelectionModel().select(selected);
}
},
onDownBtnClick : function() {
var list = this.toField.boundList,
store = list.getStore(),
selected = this.getSelections(list),
i = 0,
len = selected.length,
index = 0;
for (; i < len; ++i) {
index = Math.max(index, store.indexOf(selected[i]));
}
if (index < store.getCount() - 1) {
store.suspendEvents();
store.remove(selected, true);
store.insert(index + 2 - len, selected);
store.resumeEvents();
list.refresh();
this.syncValue();
list.getSelectionModel().select(selected);
}
},
onAddBtnClick : function() {
var me = this,
fromList = me.fromField.boundList,
selected = this.getSelections(fromList);
fromList.getStore().remove(selected);
this.toField.boundList.getStore().add(selected);
this.syncValue();
},
onRemoveBtnClick : function() {
var me = this,
toList = me.toField.boundList,
selected = this.getSelections(toList);
toList.getStore().remove(selected);
this.fromField.boundList.getStore().add(selected);
this.syncValue();
},
syncValue: function() {
this.setValue(this.toField.store.getRange());
},
onItemDblClick: function(view, rec){
var me = this,
from = me.fromField.store,
to = me.toField.store,
current,
destination;
if (view === me.fromField.boundList) {
current = from;
destination = to;
} else {
current = to;
destination = from;
}
current.remove(rec);
destination.add(rec);
me.syncValue();
},
setValue: function(value){
var me = this,
fromStore = me.fromField.store,
toStore = me.toField.store,
selected;
if (!me.fromField.store.getCount()) {
me.fromField.store.on({
load: Ext.Function.bind(me.setValue, me, [value]),
single: true
});
return;
}
value = me.setupValue(value);
me.mixins.field.setValue.call(me, value);
selected = me.getRecordsForValue(value);
Ext.Array.forEach(toStore.getRange(), function(rec){
if (!Ext.Array.contains(selected, rec)) {
toStore.remove(rec);
fromStore.add(rec);
}
});
toStore.removeAll();
Ext.Array.forEach(selected, function(rec){
if (fromStore.indexOf(rec) > -1) {
fromStore.remove(rec);
}
toStore.add(rec);
});
},
onBindStore: function(store, initial) {
var me = this;
if (me.fromField) {
me.fromField.store.removeAll()
me.toField.store.removeAll();
if (store.getCount()) {
me.populateFromStore(store);
} else {
me.store.on('load', me.populateFromStore, me);
}
}
},
populateFromStore: function(store) {
this.fromField.store.add(store.getRange());
this.fromField.store.fireEvent('load', this.fromField.store);
},
onEnable: function(){
var me = this;
me.callParent();
me.fromField.enable();
me.toField.enable();
Ext.Array.forEach(me.query('[navBtn]'), function(btn){
btn.enable();
});
},
onDisable: function(){
var me = this;
me.callParent();
me.fromField.disable();
me.toField.disable();
Ext.Array.forEach(me.query('[navBtn]'), function(btn){
btn.disable();
});
},
onDestroy: function(){
this.bindStore(null);
this.callParent();
}
});
Ext.onReady(function () {
if (Ext.firefoxVersion >= 18) {
var noArgs = [];
var callOverrideParent = function () {
var method = callOverrideParent.caller.caller; // skip callParent (our caller)
try {
} catch (e) {
} // FF 18 fix
return method.$owner.prototype[method.$name].apply(this, arguments);
};
Ext.override = function (target, overrides) {
if (target.$isClass) {
target.override(overrides);
} else if (typeof target == 'function') {
Ext.apply(target.prototype, overrides);
} else {
var owner = target.self, name, value;
if (owner && owner.$isClass) { // if (instance of Ext.define'd class)
for (name in overrides) {
if (overrides.hasOwnProperty(name)) {
value = overrides[name];
if (typeof value == 'function') {
value.$name = name;
value.$owner = owner;
value.$previous = target.hasOwnProperty(name) ? target[name] : callOverrideParent;
}
target[name] = value;
}
}
} else {
Ext.apply(target, overrides);
}
}
return target;
};
Ext.apply(Ext.Base, {
callParent: function (args) {
var method,
superMethod = (method = this.callParent.caller) && (method.$previous || ((method = method.$owner ?
method :
method.caller) && method.$owner.superclass[method.$name]));
try {
} catch (e) {
}
return superMethod.apply(this, args || noArgs);
},
callSuper: function (args) {
var method, superMethod = (method = this.callSuper.caller) &&
((method = method.$owner ? method : method.caller) &&
method.$owner.superclass[method.$name]);
try {
} catch (e) {
} // Firefox 18 fix
return superMethod.apply(this, args || noArgs);
},
statics: function () {
var self = this.self, method = this.statics.caller;
try {
} catch (e) {
} // Firefox 18 fix
if (!method) return self;
return method.$owner;
}
});
Ext.apply(Ext.Error, {
raise: function (err) {
err = err || {};
if (Ext.isString(err)) {
err = { msg: err };
}
var msg, method = this.raise.caller;
try {
} catch (e) {
} // Firefox 18 fix
if (method) {
if (method.$name) {
err.sourceMethod = method.$name;
}
if (method.$owner) {
err.sourceClass = method.$owner.$className;
}
}
if (Ext.Error.handle(err) !== true) {
msg = Ext.Error.prototype.toString.call(err);
Ext.log({
msg: msg,
level: 'error',
dump: err,
stack: true
});
throw new Ext.Error(err);
}
}
});
}
});
Ext.override(Ext.grid.header.Container, {
prepareData: function(data, rowIdx, record, view, panel) {
var me = this,
obj = {},
headers = me.gridDataColumns || me.getGridColumns(),
headersLn = headers.length,
colIdx = 0,
header,
headerId,
renderer,
value,
metaData,
allowHtml,
store = panel.store;
for (; colIdx < headersLn; colIdx++) {
metaData = {
tdCls: '',
style: ''
};
header = headers[colIdx];
headerId = header.id;
renderer = header.renderer;
allowHtml = header.allowHtml || false;
value = data[header.dataIndex];
if (allowHtml !== true && typeof value === 'string') {
value = Ext.String.getText(value);
}
if (typeof renderer == 'function') {
value = renderer.call(
header.scope || me.ownerCt,
value,
metaData,
record,
rowIdx,
colIdx,
store,
view
);
}
if (me.markDirty) {
obj[headerId + '-modified'] = record.isModified(header.dataIndex) ? Ext.baseCSSPrefix + 'grid-dirty-cell' : '';
}
obj[headerId + '-tdCls'] = metaData.tdCls;
obj[headerId + '-tdAttr'] = metaData.tdAttr;
obj[headerId + '-style'] = metaData.style;
if (typeof value === 'undefined' || value === null || value === '') {
value = header.emptyCellText;
}
obj[headerId] = value;
}
return obj;
}
});
;(function(Manager, global, arraySlice) {
Manager.isCreated = function(className) {
var existCache = this.existCache,
i, ln, part, root, parts;
if (this.classes[className] || existCache[className]) {
return true;
}
root = global;
parts = this.parseNamespace(className);
for (i = 0, ln = parts.length; i < ln; i++) {
part = parts[i];
if (typeof part != 'string') {
root = part;
} else {
if (!root || !root[part]) {
return false;
}
root = root[part];
}
}
if (/^.*\.apps\./.test(className) && typeof root != 'function') {
return false;
}
existCache[className] = true;
this.triggerCreated(className);
return true;
};
Manager.createOverride = function(className, data, createdFn) {
var me = this,
overriddenClassName = data.override,
requires = data.requires,
uses = data.uses,
check = true,
classReady = function () {
var cls, temp;
if (requires) {
temp = requires;
requires = null; // do the real thing next time (which may be now)
Ext.Loader.require(temp, classReady);
} else {
cls = me.get(overriddenClassName);
if(data.override === 'Shopware.apps.Article.view.detail.Window') {
check = me.checkOverride(cls, data);
}
delete data.override;
delete data.requires;
delete data.uses;
if(!check) {
data = { '_invalidPlugin': true, '_invalidClassName': className };
} else {
data['_invalidPlugin'] = false;
}
Ext.override(cls, data);
me.triggerCreated(className);
if (uses) {
Ext.Loader.addUsedClasses(uses); // get these classes too!
}
if (createdFn) {
createdFn.call(cls); // last but not least!
}
}
};
me.existCache[className] = true;
me.onCreated(classReady, me, overriddenClassName);
return me;
};
Manager.checkOverride =  function(cls, data) {
var match = true, fnName, fn;
for(fnName in data) {
fn = data[fnName].toString();
if(fn.match(/createMainTabPanel/i)) {
match = false;
break;
}
}
if(!match) {
for(fnName in data) {
fn = data[fnName].toString();
if(fn.match(/registerAdditionalTab/i)) {
match = true;
break;
}
}
}
return match;
};
Manager.instantiateByAlias = function() {
var alias = arguments[0],
args = arraySlice.call(arguments),
className = this.getNameByAlias(alias);
if (!className) {
className = this.maps.aliasToName[alias];
if (!className) {
throw new Error("[Ext.createByAlias] Cannot create an instance of unrecognized alias: " + alias);
}
Ext.syncRequire(className);
}
args[0] = className;
return this.instantiate.apply(this, args);
};
Manager.instantiate = function (length) {
var name = arguments[0],
nameType = typeof name,
args = arraySlice.call(arguments, 1),
alias = name,
possibleName, cls;
if (nameType !== 'function') {
if (nameType !== 'string' && args.length === 0) {
args = [name];
name = name.xclass;
}
if (typeof name != 'string' || name.length < 1) {
throw new Error("[Ext.create] Invalid class name or alias '" + name + "' specified, must be a non-empty string");
}
cls = this.get(name);
}
else {
cls = name;
}
if (!cls) {
possibleName = this.getNameByAlias(name);
if (possibleName) {
name = possibleName;
cls = this.get(name);
}
}
if (!cls) {
possibleName = this.getNameByAlternate(name);
if (possibleName) {
name = possibleName;
cls = this.get(name);
}
}
if (!cls) {
Ext.syncRequire(name);
cls = this.get(name);
}
if (!cls) {
throw new Error("[Ext.create] Cannot create an instance of unrecognized class name / alias: " + alias);
}
if (typeof cls != 'function') {
throw new Error("[Ext.create] '" + name + "' is a singleton and cannot be instantiated");
}
return this.getInstantiator(args.length)(cls, args);
}
})(Ext.ClassManager, Ext.global, Array.prototype.slice);
Ext.define('Ext.data.proxy.Server-Shopware', {
override: 'Ext.data.proxy.Server',
processResponse: function(success, operation, request, response, callback, scope) {
var me = this,
reader,
result;
if (success === true) {
reader = me.getReader();
reader.applyDefaults = operation.action === 'read';
result = reader.read(me.extractResponseData(response));
if (result.success !== false) {
Ext.apply(operation, {
response: response,
resultSet: result
});
operation.commitRecords(result.records);
operation.setCompleted();
operation.setSuccessful();
} else {
operation.setException(result.message);
me.fireEvent('exception', this, response, operation);
}
} else {
if(response.status == 401) {
window.location.reload()
}
else {
me.setException(operation, response);
me.fireEvent('exception', this, response, operation);
Ext.MessageBox.alert(operation.error.status + ' - ' + operation.error.statusText, Ext.util.Format.stripTags(response.responseText));
}
}
if (typeof callback == 'function') {
callback.call(scope || me, operation);
}
me.afterRequest(request, success);
},
encodeFilters: function(filters) {
var min = [],
length = filters.length,
i = 0;
for (; i < length; i++) {
min[i] = {
property: filters[i].property,
value   : filters[i].value,
operator: filters[i].operator,
expression: filters[i].expression
};
}
return this.applyEncoding(min);
}
});
Ext.override(Ext.app.Application, {
loadingMessage: '[0] wird geladen ...',
addController: function(controller, skipInit) {
if (Ext.isDefined(controller.name)) {
var name = controller.name;
delete controller.name;
controller.id = controller.id || name;
controller = Ext.create(name, controller);
}
var me          = this,
controllers = me.controllers;
controllers.add(controller);
if (!skipInit) {
controller.init();
}
return controller;
},
removeController: function(controller, removeListeners) {
removeListeners = removeListeners || true;
var me          = this,
controllers = me.controllers;
controllers.remove(controller);
if (removeListeners) {
var bus = me.eventbus;
bus.uncontrol([controller.id]);
}
},
addSubApplication: function(subapp, skipInit, fn, showLoadMask) {
skipInit = skipInit === true;
subapp.app = this;
if(subapp.hasOwnProperty('showLoadMask')) {
showLoadMask = subapp.showLoadMask;
}
showLoadMask = (showLoadMask === undefined) ? true : showLoadMask;
if(showLoadMask) {
this.moduleLoadMask = new Ext.LoadMask(Ext.getBody(), {
msg: Ext.String.format(this.loadingMessage, (subapp.localizedName) ? subapp.localizedName : subapp.name),
hideModal: true
});
this.moduleLoadMask.show();
}
fn = fn || Ext.emptyFn;
Ext.require(subapp.name, Ext.bind(function() {
this.addController(subapp, skipInit);
fn(subapp);
}, this));
},
getActiveWindows: function(deprecated) {
var activeWindows = [];
if (deprecated === undefined) {
deprecated = true;
}
Ext.each(Ext.WindowManager.zIndexStack, function (item) {
if (typeof(item) !== 'undefined') {
var className = item.$className;
if ((className == 'Ext.window.Window' || className == 'Enlight.app.Window' || className == 'Ext.Window' || (deprecated && className == 'Shopware.apps.Deprecated.view.main.Window')) && className != "Ext.window.MessageBox") {
activeWindows.push(item);
}
className = item.alternateClassName;
if ((className == 'Ext.window.Window' || className == 'Enlight.app.Window' || className == 'Ext.Window' || (deprecated && className == 'Shopware.apps.Deprecated.view.main.Window')) && className != "Ext.window.MessageBox") {
activeWindows.push(item);
}
}
});
return activeWindows;
}
});
Ext.override(Ext.app.Controller, {
getController: function(name) {
if(this.subApplication) {
return this.subApplication.getController(name);
}
return this.callParent(arguments);
},
getStore: function(name) {
if(this.subApplication) {
return this.subApplication.getStore(name);
}
return this.callParent(arguments);
},
getModel: function(model) {
if(this.subApplication) {
return this.subApplication.getModel(model);
}
return this.callParent(arguments);
},
getView: function(view) {
if(this.subApplication) {
return this.subApplication.getView(view);
}
return this.callParent(arguments);
},
control: function(selectors, listeners) {
var me = this;
if(me.subApplication) {
me.subApplication.control(selectors, listeners, me);
} else {
me.application.control(selectors, listeners, me);
}
},
getRef: function(ref, info, config) {
this.refCache = this.refCache || {};
info = info || {};
config = config || {};
Ext.apply(info, config);
if (info.forceCreate) {
return Ext.ComponentManager.create(info, 'component');
}
var me = this,
cached;
me.refCache[ref] = cached = me.getActiveReference(info.selector);
if (!cached && info.autoCreate) {
me.refCache[ref] = cached = Ext.ComponentManager.create(info, 'component');
}
if (cached) {
cached.on('beforedestroy', function() {
me.refCache[ref] = null;
});
}
return cached;
},
getActiveReference: function(selector) {
var me = this,
subApp = me.subApplication,
refs = Ext.ComponentQuery.query(selector),
windowManager, activeRef;
if(!subApp) {
return refs[0];
}
windowManager = subApp.windowManager;
if(!windowManager) {
return refs[0];
}
activeRef = windowManager.getActive();
var returnRef = me.getActiveWindowReference(refs, activeRef);
if(returnRef) {
return returnRef;
}
Ext.each(refs, function(ref) {
if(returnRef) return false;
var win = ref.up('window');
if(!win) return false;
var foundedWindow = me.getActiveWindowReference(win, activeRef);
if(foundedWindow) {
returnRef = ref;
return false;
}
});
return returnRef || refs[0];
},
getActiveWindowReference: function(refs, activeRef) {
var returnRef = false;
Ext.each(refs, function(ref) {
if(returnRef) {
return false;
}
if(ref === activeRef) {
returnRef = ref;
return false;
}
});
return returnRef;
}
});
(function() {
var requestMap = {};
var getRequestKey = Ext.bind(function(path, files) {
files = (typeof files == 'string') ? [files] : files;
return path + ',' + files.join(',');
}, Ext.Loader);
var abortAsyncRequest = Ext.bind(function(requestInfo) {
switch(requestInfo.mode) {
case 'xhr':
Ext.Ajax.abort(requestInfo.identifier);
this.numPendingFiles -= requestInfo.fileCount;
break;
default:
Ext.Error.raise("Unknown requestInfo type. Can not abort");
}
}, Ext.Loader);
var cleanIfAsyncRequestExists = Ext.bind(function(requestKey) {
if (requestMap.hasOwnProperty(requestKey)) {
abortAsyncRequest(requestMap[requestKey]);
delete requestMap[requestKey];
}
}, Ext.Loader);
var loadNamespacedClasses = Ext.bind(function(namespaces) {
var host = window.location.protocol + "//" + window.location.hostname;
Ext.iterate(namespaces, function(key, namespace){
var path = namespace.path,
cacheKey,
disableCachingValue = this.getConfig('disableCachingValue'),
requestMethod = "post",
tmpPath,
maxLength = maxParameterLength - 50,
files = [];
if (maxLength <= 0) {
maxLength = 1950;
}
if (namespace.files.length <= 1 && namespace.files[0].indexOf('?file') !== -1) {
path += namespace.files[0];
requestMethod = "get";
} else {
tmpPath = path;
tmpPath += "?f=";
files = [];
Ext.each(namespace.files, function (file) {
file = file.replace(/^model\//, 'm/');
file = file.replace(/^controller\//, 'c/');
file = file.replace(/^view\//, 'v/');
files.push(file);
});
tmpPath += files.join('|');
if (tmpPath.length + host.length < maxLength) {
requestMethod = "get";
path = tmpPath;
}
}
if (!this.getConfig('caching')) {
path += (requestMethod === 'get') ? '&' : '?';
path += this.getConfig('disableCachingParam') + '=' + disableCachingValue;
}
cacheKey = getRequestKey(path, namespace.files);
if (this.syncModeEnabled) {
cleanIfAsyncRequestExists(cacheKey);
} else {
if (requestMap.hasOwnProperty(cacheKey)) {
return;
}
}
var xhr = Ext.Ajax.request({
url: path,
method: requestMethod,
disableCaching: false,
async: !this.syncModeEnabled,
params: (requestMethod === 'get')
? (null)
: ({ 'file[]': namespace.files }),
scope: this,
success: function(response) {
try {
Ext.globalEval(response.responseText + "\n//# sourceURL=" + path);
} catch(err) {
Shopware.app.Application.fireEvent('Ext.Loader:evalFailed', err, response, namespace, requestMethod);
}
this.onFilesLoaded(namespace.classNames);
if (requestMap.hasOwnProperty(cacheKey)) {
delete requestMap[cacheKey];
}
},
failure: function(xhr) {
Shopware.app.Application.fireEvent('Ext.Loader:xhrFailed', xhr, namespace, requestMethod);
cleanIfAsyncRequestExists(cacheKey);
}
});
if (!this.syncModeEnabled) {
requestMap[cacheKey] = {
mode: 'xhr',
identifier: xhr,
fileCount: namespace.files.length
};
}
}, this);
}, Ext.Loader);
Ext.Loader.getPath = function(className, prefix) {
var path = '',
paths = this.config.paths,
suffix = this.config.suffixes[prefix] !== undefined ? this.config.suffixes[prefix] : '.js';
if (prefix.length > 0) {
if (prefix === className) {
return paths[prefix];
}
path = paths[prefix];
className = className.substring(prefix.length + 1);
}
if (path.length > 0) {
path = path.replace(/\/+$/, '') + '/';
}
return [path.replace(/\/\.\//g, '/'), className.replace(/\./g, "/") + suffix];
};
Ext.Loader.config.disableCaching = false;
Ext.Loader.config.caching = true;
Ext.Loader.requestQueue = [];
Ext.Loader.require = function(expressions, fn, scope, excludes) {
var Manager = Ext.ClassManager;
var expression, exclude, className, excluded = {},
excludedClassNames = [],
possibleClassNames = [],
possibleClassName, classNames = [],
namespaces = {},
i, j, ln, subLn;
if(!this.getConfig('disableCachingValue')) {
this.setConfig('disableCachingValue', Ext.Date.now());
}
if(this.getConfig('disableCaching')) {
this.setConfig('caching', false);
this.setConfig('disableCaching', false);
}
var disableCachingValue = this.getConfig('disableCachingValue'),
disableCaching = !this.getConfig('caching');
expressions = Ext.Array.from(expressions);
excludes = Ext.Array.from(excludes);
fn = fn || Ext.emptyFn;
scope = scope || Ext.global;
for (i = 0, ln = excludes.length; i < ln; i++) {
exclude = excludes[i];
if (typeof exclude === 'string' && exclude.length > 0) {
excludedClassNames = Manager.getNamesByExpression(exclude);
for (j = 0, subLn = excludedClassNames.length; j < subLn; j++) {
excluded[excludedClassNames[j]] = true;
}
}
}
for (i = 0, ln = expressions.length; i < ln; i++) {
expression = expressions[i];
if (typeof expression === 'string' && expression.length > 0) {
possibleClassNames = Manager.getNamesByExpression(expression);
for (j = 0, subLn = possibleClassNames.length; j < subLn; j++) {
possibleClassName = possibleClassNames[j];
if (!excluded.hasOwnProperty(possibleClassName) && !Manager.isCreated(possibleClassName)) {
Ext.Array.include(classNames, possibleClassName);
}
}
}
}
if (!this.config.enabled) {
if (classNames.length > 0) {
Ext.Error.raise({
sourceClass: "Ext.Loader",
sourceMethod: "require",
msg: "Ext.Loader is not enabled, so dependencies cannot be resolved dynamically. " +
"Missing required class" + ((classNames.length > 1) ? "es" : "") + ": " + classNames.join(', ')
});
}
}
if (classNames.length === 0) {
fn.call(scope);
return this;
}
if (!this.syncModeEnabled) {
this.queue.push({
requires: classNames,
callback: fn,
scope: scope
});
}
classNames = classNames.slice();
for (i = 0, ln = classNames.length; i < ln; i++) {
className = classNames[i];
if (!this.isFileLoaded.hasOwnProperty(className) || !this.isFileLoaded[className]) {
namespaces = this.loadNamespaces(className, namespaces);
} else {
if (!this.syncModeEnabled) {
this.refreshQueue();
}
}
}
loadNamespacedClasses(namespaces);
if (this.syncModeEnabled) {
fn.call(scope);
}
return this;
};
Ext.Loader.loadNamespaces = function (className, namespaces) {
this.isFileLoaded[className] = false;
var prefix = this.getPrefix(className),
separatedPath = this.getPath(className, prefix),
substring = className.substring(prefix.length + 1);
if (this.isMainAppMissing(substring, prefix)) {
var rightPart = substring.split('.')[0];
namespaces = this.loadNamespaces('Shopware.apps.' + rightPart, namespaces);
loadNamespacedClasses(namespaces);
namespaces = {};
prefix = this.getPrefix(className);
separatedPath = this.getPath(className, prefix);
}
this.numPendingFiles++;
if (!namespaces[prefix]) {
namespaces[prefix] = { 'prefix': prefix, 'path': separatedPath[0], 'files': [], 'classNames': [] };
}
namespaces[prefix]['files'].push(separatedPath[1]);
namespaces[prefix]['classNames'].push(className);
return namespaces;
};
Ext.Loader.isMainAppMissing = function (substring, prefix) {
if (prefix === 'Shopware.apps' && substring.split('.').length > 1) {
return true;
}
return false;
};
Ext.Loader.onFilesLoaded = function(classNames) {
var me = this;
Ext.iterate(classNames, function(className){
me.numLoadedFiles++;
me.isFileLoaded[className] = true;
me.numPendingFiles--;
});
me.refreshQueue();
};
Ext.Loader.setPath = function(name, path, suffix, bulk) {
this.config.paths[name] = path;
if(this.config.suffixes === undefined) {
this.config.suffixes = [];
}
if(suffix !== undefined) {
this.config.suffixes[name] = suffix;
}
return this;
};
})();
Ext.override(Ext.app.EventBus, {
dispatch: function(ev, target, args) {
var bus = this.bus,
selectors = bus[ev],
selector, controllers, id, events, event, i, ln;
if(target && typeof(target.up) === 'function') {
try {
var win = (target.isMainWindow || target.isSubWindow ? target : target.up('window'));
if(win && win.subApplication) {
bus = win.subApplication.eventbus.bus;
selectors = bus[ev];
} else {
var pnl = target.up('panel') || target;
if(pnl && pnl.subApplication) {
bus = pnl.subApplication.eventbus.bus;
selectors = bus[ev];
}
}
} catch(e) { }
}
if (selectors) {
for (selector in selectors) {
if (selectors.hasOwnProperty(selector) && target.is(selector)) {
controllers = selectors[selector];
for (id in controllers) {
if (controllers.hasOwnProperty(id)) {
events = controllers[id];
for (i = 0, ln = events.length; i < ln; i++) {
event = events[i];
if (event.fire.apply(event, Array.prototype.slice.call(args, 1)) === false) {
return false;
}
}
}
}
}
}
}
return true;
},
uncontrol: function(controllerArray) {
var me  = this,
bus = me.bus,
deleteThis, idx;
Ext.iterate(bus, function(ev, controllers) {
Ext.iterate(controllers, function(query, controller) {
deleteThis = false;
Ext.iterate(controller, function(controlName) {
idx = controllerArray.indexOf(controlName);
if (idx >= 0) {
deleteThis = true;
}
});
if (deleteThis) {
delete controllers[query];
}
});
});
}
});
Ext.override(Ext.button.Button, {
dataSuffix: 'action',
afterRender: function() {
var me = this;
me.callOverridden(arguments);
if(me.action) {
var dom = me.getEl().dom.children[0].children[0];
dom.setAttribute('data-' + me.dataSuffix, me.action);
}
},
initComponent: function() {
var me = this;
me.callParent(arguments);
me.addEvents(
'click',
'toggle',
'mouseover',
'mouseout',
'menushow',
'menuhide',
'menutriggerover',
'menutriggerout'
);
if (me.menu) {
me.split = true
me.menu = Ext.menu.Manager.get(me.menu);
if(me.menuCls && me.menuCls.length) {
me.menu.setUI('default shopware-ui');
me.menu.addCls(me.menuCls);
}
me.menu.ownerCt = me;
}
if (me.url) {
me.href = me.url;
}
if (me.href && !me.hasOwnProperty('preventDefault')) {
me.preventDefault = false;
}
if (Ext.isString(me.toggleGroup)) {
me.enableToggle = true;
}
},
showMenu: function() {
var me = this;
if (me.rendered && me.menu) {
if (me.tooltip && me.getTipAttr() != 'title') {
Ext.tip.QuickTipManager.getQuickTip().cancelShow(me.btnEl);
}
if (me.menu.isVisible()) {
me.menu.hide();
}
if(me.menu && me.menuOffset) {
me.menu.showBy(me.el, me.menuAlign, me.menuOffset);
} else {
me.menu.showBy(me.el, me.menuAlign);
}
}
return me;
}
});
Ext.define('Ext.LoadMask-Shopware', {
override: 'Ext.LoadMask',
_delayedTask: null,
hideLoadingMsg: false,
hideModal: false,
bindComponent: function(comp){
var me = this,
listeners = {
scope: this,
resize: me.sizeMask,
added: me.onComponentAdded,
removed: me.onComponentRemoved
},
hierarchyEventSource = Ext.container.Container.hierarchyEventSource;
me.hideLoadingMsg = comp.hideLoadingMsg || false;
if (comp.floating) {
listeners.move = me.sizeMask;
me.activeOwner = comp;
} else if (comp.ownerCt) {
me.onComponentAdded(comp.ownerCt);
} else {
me.preventBringToFront = true;
}
me.mon(comp, listeners);
me.mon(hierarchyEventSource, {
show: me.onContainerShow,
hide: me.onContainerHide,
expand: me.onContainerExpand,
collapse: me.onContainerCollapse,
scope: me
});
},
bindStore : function(store, initial) {
var me = this;
me.hideLoadingMsg = me.hideLoadingMsg || false;
if(!me.hideLoadingMsg) {
me.mixins.bindable.bindStore.apply(me, arguments);
}
store = me.store;
if (store && store.isLoading() && !me.hideLoadingMsg) {
me.onBeforeLoad();
}
},
initComponent: function() {
var me = this;
try {
me.callOverridden(arguments);
} catch(err) {  }
if(me.delay && me.delay > 0) {
me._delayedTask = new Ext.util.DelayedTask(function() {
me.hide();
});
me._delayedTask.delay(me.delay);
}
},
hide: function() {
try {
this.callOverridden(arguments);
} catch(err) {  }
if(this._delayedTask) {
this._delayedTask.cancel();
this._delayedTask = null;
}
},
show: function() {
var me = this;
if (this.isElement) {
this.ownerCt.mask(this.useMsg ? this.msg : '', this.msgCls);
this.fireEvent('show', this);
if(me.hideModal) {
var mask = Ext.get(Ext.getBody().query('.x-mask')[0]);
mask.hide();
}
return;
}
return this.callParent(arguments);
}
});
Ext.define('Enlight.form.Field',
{
override: 'Ext.form.Field',
afterRender: function () {
var me = this;
me.callParent(arguments);
me.initHelpSupportElements();
},
}, function()
{
Ext.form.Field.mixin('helpSupportElems', Enlight.form.mixin.HelpSupportElements);
});
Ext.define('Enlight.form.field.HtmlEditor', {
override: 'Ext.form.field.HtmlEditor',
afterRender: function () {
var me = this;
me.callParent(arguments);
me.initHelpSupportElements();
},
},
function() {
Ext.form.field.HtmlEditor.mixin('helpSupportElems', Enlight.form.mixin.HelpSupportElements);
});
Ext.override(Ext.toolbar.Paging, {
getPagingItems: function() {
var me = this;
return [{
itemId: 'first',
tooltip: me.firstText,
overflowText: me.firstText,
iconCls: Ext.baseCSSPrefix + 'tbar-page-first',
action: 'firstPage',
disabled: true,
handler: me.moveFirst,
scope: me
},{
itemId: 'prev',
tooltip: me.prevText,
overflowText: me.prevText,
iconCls: Ext.baseCSSPrefix + 'tbar-page-prev',
action: 'prevPage',
disabled: true,
handler: me.movePrevious,
scope: me
},
'-',
me.beforePageText,
{
xtype: 'numberfield',
itemId: 'inputItem',
name: 'inputItem',
cls: Ext.baseCSSPrefix + 'tbar-page-number',
allowDecimals: false,
minValue: 1,
hideTrigger: true,
enableKeyEvents: true,
selectOnFocus: true,
submitValue: false,
width: me.inputItemWidth,
margins: '-1 2 3 2',
listeners: {
scope: me,
keydown: me.onPagingKeyDown,
blur: me.onPagingBlur
}
},{
xtype: 'tbtext',
itemId: 'afterTextItem',
text: Ext.String.format(me.afterPageText, 1)
},
'-',
{
itemId: 'next',
tooltip: me.nextText,
overflowText: me.nextText,
iconCls: Ext.baseCSSPrefix + 'tbar-page-next',
action: 'nextPage',
disabled: true,
handler: me.moveNext,
scope: me
},{
itemId: 'last',
tooltip: me.lastText,
overflowText: me.lastText,
iconCls: Ext.baseCSSPrefix + 'tbar-page-last',
action: 'lastPage',
disabled: true,
handler: me.moveLast,
scope: me
},
'-',
{
itemId: 'refresh',
tooltip: me.refreshText,
overflowText: me.refreshText,
iconCls: Ext.baseCSSPrefix + 'tbar-loading',
action: 'refreshPage',
handler: me.doRefresh,
scope: me
}];
},
doRefresh : function(){
var me = this,
current = me.store.currentPage,
refreshButton = me.child('#refresh');
if(refreshButton) {
refreshButton.disable();
}
if (me.fireEvent('beforechange', me, current) !== false) {
me.store.loadPage(current);
}
}
});
Ext.override(Ext.Template, {
re: /[{\[]([\w\-]+)(?:\:([\w\.]*)(?:\((.*?)?\))?)?[}\]]/g
});
Ext.override(Ext.String, {
format: function(format) {
var formatRe = /[{\[](\d+)[}\]]/g;
var args = Ext.Array.toArray(arguments, 1);
return format.replace(formatRe, function(m, i) {
return args[i];
});
}
});
Ext.override(Ext.form.Basic, {
submit: function (options) {
options = options || {};
var me = this,
action;
if (options.standardSubmit || me.standardSubmit) {
action = 'standardsubmit';
} else {
action = me.api ? 'directsubmit' : 'submit';
}
options.params = options.params || {};
options.params.__csrf_token = Ext.CSRFService.getToken();
return me.doAction(action, options);
},
loadRecord: function(record) {
var me = this;
if(record && record.associations && record.associations.length) {
var data = record.getAssociatedData(),
values = Ext.clone(record.data);
Ext.each(record.associations.items, function(item) {
if(!Ext.isObject(item)) {
return;
}
if (data[item.name] !== Ext.undefined) {
var model = Ext.create(item.associatedName, data[item.name][0]);
Ext.each(model.fields.keys, function(key) {
values[item.associationKey + '[' + key + ']'] = model.data[key];
});
}
});
me.setValues(values);
}
if(record) {
me.callOverridden(arguments);
} else {
me._record = undefined;
me.reset();
}
me.fireEvent('recordchange', me, record);
},
updateRecord: function(record) {
record = record || this._record;
var values = this.getValues(),
fields = record.fields,
data = {}, associationModel, associationUpdated;
record.associations.each(function(association) {
var associationStore = record[association.storeName];
associationUpdated = false;
if (!(associationStore instanceof Ext.data.Store)) {
associationStore = Ext.create('Ext.data.Store', {
model: association.associatedName
});
}
if (associationStore.getCount() > 0) {
associationModel = associationStore.first()
} else {
associationModel = Ext.create(association.associatedName);
}
Ext.each(associationModel.fields.keys, function(key) {
var fieldName = association.associationKey + '['+ key +']';
if (fieldName in values) {
associationModel.set(key, values[fieldName]);
associationUpdated = true;
delete values[fieldName];
}
});
if (associationStore.getCount() === 0 && associationUpdated) {
associationStore.add(associationModel);
}
record[association.storeName] = associationStore;
});
fields.each(function(field) {
var name = field.name;
if (name in values) {
data[name] = values[name];
}
});
record.beginEdit();
record.set(data);
record.endEdit();
return this;
}
});
Ext.define('Ext.data.writer.Json-Shopware', {
override: 'Ext.data.writer.Json',
getRecordData: function (record, operation) {
var me = this, data;
data = me.getRecordFieldData(record, operation);
if (record.associations && record.associations.length > 0) {
me.setRecordAssociationData(record, data);
}
return data;
},
getRecordFieldData: function(record, operation) {
var isPhantom = record.phantom === true,
writeAll = this.writeAllFields || isPhantom,
nameProperty = this.nameProperty,
fields = record.fields,
fieldItems = fields.items,
data = {},
clientIdProperty = record.clientIdProperty,
changes,
name,
field,
key,
value,
f, fLen;
if (writeAll) {
fLen = fieldItems.length;
for (f = 0; f < fLen; f++) {
field = fieldItems[f];
if (field.persist) {
name = field[nameProperty] || field.name;
value = record.get(field.name);
if (field.serialize) {
data[name] = field.serialize(value, record);
} else if (field.type === Ext.data.Types.DATE && field.dateFormat && Ext.isDate(value)) {
data[name] = Ext.Date.format(value, field.dateFormat);
} else {
data[name] = value;
}
}
}
} else {
changes = record.getChanges();
for (key in changes) {
if (changes.hasOwnProperty(key)) {
field = fields.get(key);
if (field.persist) {
name = field[nameProperty] || field.name;
value = record.get(field.name);
if (field.serialize) {
data[name] = field.serialize(value, record);
} else if (field.type === Ext.data.Types.DATE && field.dateFormat && Ext.isDate(value)) {
data[name] = Ext.Date.format(value, field.dateFormat);
} else {
data[name] = value;
}
}
}
}
}
if (isPhantom) {
if (clientIdProperty && operation && operation.records.length > 1) {
data[clientIdProperty] = record.internalId;
}
} else {
data[record.idProperty] = record.getId();
}
return data;
},
setRecordAssociationData: function(record, data) {
var me = this, associatedData;
record.associations.each(function(association) {
var associationStore = record[association.storeName];
if (associationStore instanceof Ext.data.Store && associationStore.getCount() > 0) {
data[association.associationKey] = [];
associationStore.each(function(associatedRecord) {
if (associatedRecord instanceof Ext.data.Model) {
associatedData = me.getRecordFieldData(associatedRecord);
if (associatedRecord.associations && associatedRecord.associations.length > 0) {
me.setRecordAssociationData(associatedRecord, associatedData);
}
data[association.associationKey].push(associatedData);
}
});
} else {
data[association.associationKey] = [];
}
});
}
});
Ext.override(Ext.grid.column.Action, {
dataSuffix: 'action',
constructor: function(config) {
var me = this,
cfg = Ext.apply({}, config),
items = cfg.items || [me],
i,
item;
delete cfg.items;
me.callParent([cfg]);
me.items = items;
me.renderer = function(v, meta) {
v = Ext.isFunction(cfg.renderer) ? cfg.renderer.apply(this, arguments)||'' : '';
meta.tdCls += ' ' + Ext.baseCSSPrefix + 'action-col-cell';
for (i = 0; i < me.items.length; i++) {
item = me.items[i];
item.disable = Ext.Function.bind(me.disableAction, me, [i]);
item.enable = Ext.Function.bind(me.enableAction, me, [i]);
var dataString = '';
if (item.action) {
dataString = ' data-' + me.dataSuffix + '="' + item.action + '" ';
}
v += '<img alt="' + (item.altText || me.altText) + '" src="' + (item.icon || Ext.BLANK_IMAGE_URL) +
'" class="' + Ext.baseCSSPrefix + 'action-col-icon ' + Ext.baseCSSPrefix + 'action-col-' + String(i) + ' ' + (item.disabled ? Ext.baseCSSPrefix + 'item-disabled' : ' ') + (item.iconCls || '') +
' ' + (Ext.isFunction(item.getClass) ? item.getClass.apply(item.scope||me.scope||me, arguments) : (me.iconCls || '')) + '"' +
((item.tooltip) ? ' data-qtip="' + item.tooltip + '"' : '') + dataString + ' />';
}
return v;
};
}
});
Ext.override(Ext.view.BoundList,
{
dataSuffix: 'action',
afterRender: function() {
var me = this;
me.callOverridden(arguments);
if(me.el.dom && me.pickerField) {
var dom = me.el.dom,
value = me.action || me.pickerField.name;
dom.setAttribute('data-' + me.dataSuffix, value);
}
}
});
Ext.override(Ext.form.field.ComboBox,
{
dataSuffix: 'action',
valueSuffix: '-table',
afterRender: function() {
var me = this;
me.callOverridden(arguments);
if(me.el.dom) {
var dom = me.el.dom,
value = (me.listConfig) ? me.listConfig.action : me.name;
dom.setAttribute('data-' + me.dataSuffix, value + me.valueSuffix);
}
}
});
Ext.override(Ext.form.field.Time,
{
safeParse: function(value, format){
var me = this,
utilDate = Ext.Date,
parsedDate,
result = null,
altFormats = me.altFormats,
altFormatsArray = me.altFormatsArray,
j = 0,
len;
if (utilDate.formatContainsDateInfo(format)) {
result = utilDate.parse(value, format);
} else {
parsedDate = utilDate.parse(me.initDate + ' ' + value, me.initDateFormat + ' ' + format);
if (parsedDate) {
result = parsedDate;
} else {
if (!result && altFormats) {
altFormatsArray = altFormatsArray || altFormats.split('|');
len = altFormatsArray.length;
for (; j < len && !result; ++j) {
parsedDate = utilDate.parse(me.initDate + ' ' + value, me.initDateFormat + ' ' + altFormatsArray[j]);
if (parsedDate) {
result = parsedDate;
}
}
}
}
}
return result;
}
});
Ext.override(Ext.form.field.Number,
{
submitLocaleSeparator: false
});
Ext.override(Ext.tree.Panel, {
animate: Ext.isChrome,
initComponent: function() {
var me = this;
me.animate = Ext.isChrome;
me.callOverridden(arguments);
}
});
Ext.override(Ext.panel.Panel, {
animCollapse: Ext.isChrome,
initComponent: function() {
var me = this;
me.animCollapse = Ext.isChrome;
me.callOverridden(arguments);
},
ghost: function(cls, windowMoving) {
var me = this,
ghostPanel = me.ghostPanel,
box = me.getBox(),
header;
if (!ghostPanel) {
ghostPanel = new Ext.panel.Panel({
renderTo: document.body,
floating: {
shadow: false
},
frame: me.frame && !me.alwaysFramed,
alwaysFramed: me.alwaysFramed,
overlapHeader: me.overlapHeader,
headerPosition: me.headerPosition,
baseCls: me.baseCls,
cls: me.baseCls + '-ghost ' + (cls ||'')
});
me.ghostPanel = ghostPanel;
}
ghostPanel.floatParent = me.floatParent;
if (me.floating) {
ghostPanel.setZIndex(Ext.Number.from(me.el.getStyle('zIndex'), (windowMoving) ? -10 : 0));
} else {
if(!windowMoving) {
ghostPanel.toFront();
}
}
if (!(me.preventHeader || (me.header === false))) {
header = ghostPanel.header;
if (header) {
header.suspendLayouts();
Ext.Array.forEach(header.query('tool'), header.remove, header);
header.resumeLayouts();
}
ghostPanel.addTool(me.ghostTools());
ghostPanel.setTitle(me.title);
ghostPanel.setIconCls(me.iconCls);
}
ghostPanel.el.show();
ghostPanel.setPagePosition(box.x, box.y);
Ext.defer(function() {
ghostPanel.setSize(box.width, box.height);
}, 10, me);
me.el.hide();
return ghostPanel;
},
unghost: function(show, matchPosition, windowMoving) {
var me = this;
if (!me.ghostPanel) {
return;
}
if (show !== false) {
me.el.show();
if (matchPosition !== false) {
me.setPagePosition(me.ghostPanel.el.getXY());
if (me.hideMode == 'offsets') {
delete me.el.hideModeStyles;
}
}
if(!windowMoving) {
Ext.defer(me.focus, 10, me);
}
}
me.ghostPanel.el.hide();
},
});
Ext.override(Ext.ZIndexManager, {
_showModalMask: function(comp) {
var me = this,
zIndex = comp.el.getStyle('zIndex') - 4,
maskTarget = comp.floatParent ? comp.floatParent.getTargetEl() : comp.container,
viewSize = maskTarget.getBox(),
viewport = Shopware.app.Application.viewport;
if (maskTarget.dom === document.body) {
viewSize.height = Math.max(document.body.scrollHeight, Ext.dom.Element.getDocumentHeight()) + 1000;
viewSize.width = Math.max(document.body.scrollWidth, viewSize.width);
}
if (!me.mask && !Shopware.app.Application.globalMask) {
var body = Ext.getBody();
if(viewport) {
body = viewport.getActiveDesktop().getEl();
}
me.mask = body.createChild({
cls: Ext.baseCSSPrefix + 'mask'
});
me.mask.setVisibilityMode(Ext.Element.DISPLAY);
me.mask.on('click', me._onMaskClick, me);
Shopware.app.Application.globalMask = me.mask;
}
me.mask = me.mask || Shopware.app.Application.globalMask;
me.mask.insertAfter(comp.el);
me.mask.maskTarget = maskTarget;
maskTarget.addCls(Ext.baseCSSPrefix + 'body-masked');
me.mask.setBox(viewSize);
me.mask.setStyle('zIndex', zIndex);
me.mask.show();
},
register : function(comp, skipGlobalRegister, skipInit) {
var me = this;
skipInit = skipInit || false;
skipGlobalRegister = skipGlobalRegister || false;
if (comp.zIndexManager && !skipGlobalRegister) {
comp.zIndexManager.unregister(comp);
}
if(!skipInit) {
comp.zIndexManager = me;
}
me.list[comp.id] = comp;
me.zIndexStack.push(comp);
comp.on('hide', me.onComponentHide, me);
}
});
Ext.override(Ext.MessageBox, {
afterRender: function() {
var me = this,
toolbar = me.dockedItems.getAt(1);
toolbar.addCls('shopware-toolbar');
toolbar.setUI('shopware-ui');
Ext.each(me.msgButtons, function(button) {
if(button.itemId === 'ok' || button.itemId === 'yes') {
button.addCls('primary')
} else {
button.addCls('secondary');
}
});
me.callOverridden(arguments);
},
reconfigure: function() {
var me = this;
me.msg.allowHtml = true;
me.callParent(arguments);
}
});
Ext.override(Ext.grid.RowEditor, {
style: {
background: '#eaf1fb'
},
getFloatingButtons: function() {
var me = this,
cssPrefix = Ext.baseCSSPrefix,
btnsCss = cssPrefix + 'grid-row-editor-buttons',
plugin = me.editingPlugin,
btns;
if (!me.floatingButtons) {
btns = me.floatingButtons = new Ext.Container({
renderTpl: [
'<div class="{baseCls}-ml"></div>',
'<div class="{baseCls}-mr"></div>',
'<div class="{baseCls}-bl"></div>',
'<div class="{baseCls}-br"></div>',
'<div class="{baseCls}-bc"></div>',
'{%this.renderContainer(out,values)%}'
],
width: 200,
renderTo: me.el,
baseCls: btnsCss,
layout: {
type: 'hbox',
align: 'middle'
},
defaults: {
flex: 1,
margins: '0 1 0 1'
},
items: [{
itemId: 'update',
xtype: 'button',
cls: 'primary small',
handler: plugin.completeEdit,
scope: plugin,
text: me.saveBtnText,
disabled: !me.isValid,
minWidth: Ext.panel.Panel.prototype.minButtonWidth
}, {
xtype: 'button',
handler: plugin.cancelEdit,
scope: plugin,
cls: 'secondary small',
text: me.cancelBtnText,
minWidth: Ext.panel.Panel.prototype.minButtonWidth
}]
});
me.mon(btns.el, {
mousedown: Ext.emptyFn,
click: Ext.emptyFn,
stopEvent: true
});
}
return me.floatingButtons;
},
startEdit: function(record) {
var me = this,
grid = me.editingPlugin.grid,
store = grid.store,
context = me.context = Ext.apply(me.editingPlugin.context, {
view: grid.getView(),
store: store
}),
keepExisting = me.editingPlugin.keepExisting || false;
context.grid.getSelectionModel().select(record, keepExisting);
me.loadRecord(record);
if (!me.isVisible()) {
me.show();
me.focusContextCell();
} else {
me.reposition({
callback: this.focusContextCell
});
}
}
});
Ext.override(Ext.picker.Date, {
beforeRender: function () {
var me = this;
me.callOverridden();
if(me.todayBtn) {
me.todayBtn.addCls('small').addCls('secondary');
}
}
});
Ext.define('Ext.data.association.HasMany-Shopware', {
override: 'Ext.data.association.HasMany',
lazyLoading: true,
relation: undefined,
storeClass: undefined,
field: undefined,
createStore: function() {
var that            = this,
associatedModel = that.associatedModel,
storeName       = that.storeName,
foreignKey      = that.foreignKey,
primaryKey      = that.primaryKey,
filterProperty  = that.filterProperty,
autoLoad        = that.autoLoad,
storeConfig     = that.storeConfig || {};
return function() {
var me = this,
config, filter,
modelDefaults = {};
if (me[storeName] === undefined) {
if (filterProperty) {
filter = {
property  : filterProperty,
value     : me.get(filterProperty),
exactMatch: true
};
} else {
filter = {
property  : foreignKey,
value     : me.get(primaryKey),
exactMatch: true
};
}
modelDefaults[foreignKey] = me.get(primaryKey);
config = Ext.apply({}, storeConfig, {
model        : associatedModel,
filters      : [filter],
remoteFilter : false,
modelDefaults: modelDefaults,
association  : that
});
if (that.hasOwnProperty('storeClass')) {
config.extraParams = {
id: me.get(primaryKey),
association: that.associationKey
};
me[storeName] = Ext.create(that.storeClass, config);
} else {
me[storeName] = Ext.data.AbstractStore.create(config);
if (autoLoad) {
me[storeName].load();
}
}
}
return me[storeName];
};
}
});
Ext.override(Ext.menu.Menu, {
onMouseLeave: function(ev) {
var activeItem = this.activeItem,
menu = activeItem && activeItem.menu,
menuEl = menu && menu.getEl();
if (Ext.isChrome && menuEl && menuEl.contains(ev.getRelatedTarget())) {
return;
}
this.callParent([ev]);
}
});
var ajaxTimeout = 30;
if (ajaxTimeout >= 6) {
Ext.Ajax.timeout= ajaxTimeout * 1000;
Ext.override(Ext.form.Basic,
{ timeout: ajaxTimeout }
);
Ext.override(Ext.data.proxy.Server,
{ timeout: Ext.Ajax.timeout }
);
Ext.override(Ext.data.Connection,
{ timeout: Ext.Ajax.timeout }
);
}
Ext.CSRFService = (function() {
var me = this;
me.tokenReceived = false;
me.csrfToken = "";
me.requestMethod = function() { };
me.interceptedRequests = [];
me.requestToken = function() {
Ext.Ajax.request({
headers: {
ignoreCSRFToken: true
},
url: '/stageware12/backend/CSRFToken/generate',
success: function(response) {
me.csrfToken = response.getResponseHeader('x-csrf-token');
me.tokenReceived = true;
me.continueRequests();
}
});
};
me.getToken = function() {
return me.csrfToken;
};
me.onBeforeRequest = function(conn, options) {
if (me.csrfToken.length === 0) {
return;
}
if (typeof options.headers === "undefined") {
options.headers = { };
}
options.headers['X-CSRF-Token'] = me.csrfToken;
};
me.registerAjaxInterceptor = function () {
var me = this;
me.requestMethod = Ext.Ajax.request;
Ext.merge(Ext.Ajax, {
request: function(options) {
if (me.tokenReceived || (options.headers && options.headers.ignoreCSRFToken === true)) {
return me.requestMethod.apply(this,  [options]);
}
me.interceptedRequests.push({ context: this, options: options });
}
});
};
me.continueRequests = function() {
var me = this;
if (me.interceptedRequests.length === 0) {
return;
}
Ext.each(me.interceptedRequests, function(request) {
me.requestMethod.apply(request.context, [request.options]);
});
me.interceptedRequests.length = 0;
};
me.registerAjaxEvent = function () {
var me = this;
Ext.Ajax.on('beforerequest', me.onBeforeRequest);
};
me.init = function() {
me.registerAjaxInterceptor();
me.registerAjaxEvent();
me.requestToken();
};
me.init();
return me;
})();
Ext.override(Ext.container.DockingContainer, {
dockedItems: []
});
Ext.define('Shopware.data.reader.Application', {
extend: 'Ext.data.reader.Json',
alternateClassName: 'Ext.data.ApplicationReader',
alias: 'reader.application',
extractData: function(root) {
var me = this,
records = [],
Model   = me.model,
length  = root.length,
modelIteration = null,
convertedValues, node, record, i;
if (!root.length && Ext.isObject(root)) {
root = [root];
length = 1;
}
modelIteration = me.model;
for (i = 0; i < length; i++) {
node = root[i];
if (!node.isModel) {
me.setModel(modelIteration, true);
record = new Model(undefined, me.getId(node), node, convertedValues = {});
record.phantom = false;
me.convertRecordData(convertedValues, node, record);
records.push(record);
if (me.implicitIncludes) {
me.readAssociated(record, node);
}
} else {
records.push(node);
}
}
return records;
}
});
Ext.override(Ext.form.field.Display, {
allowHtml: false,
getDisplayValue: function() {
var me = this,
value = me.callParent(arguments);
if (me.allowHtml !== true && typeof value === 'string') {
value = Ext.String.getText(value);
}
return value;
}
});
Ext.override(Ext.String, {
_domParser: new DOMParser(),
getText: function(value) {
var me = this;
if (!value) {
return '';
}
var elementNodes = me._domParser
.parseFromString(Ext.String.format('<div>[0]</div>', value), "text/html")
.documentElement
.querySelectorAll('div');
return me._getText(elementNodes);
},
_getText: function(elem) {
var node,
ret = '',
i = 0,
nodeType = elem.nodeType;
if (!nodeType) {
while ((node = elem[i++])) {
ret += this._getText(node);
}
} else if (nodeType === 1 || nodeType === 9 || nodeType === 11) {
if (typeof elem.textContent === 'string') {
return elem.textContent;
} else {
for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
ret += this._getText(elem);
}
}
} else if (nodeType === 3 || nodeType === 4) {
return elem.nodeValue;
}
return ret;
}
});
Ext.override(Ext.view.Table, {
onUpdate : function(store, record, operation, changedFieldNames) {
var me = this,
index,
newRow, newAttrs, attLen, i, attName, oldRow, oldRowDom,
oldCells, newCells, len, i,
columns, overItemCls,
isHovered, row,
isEditing = me.editingPlugin && me.editingPlugin.editing;
if (me.viewReady) {
index = me.store.indexOf(record);
columns = me.headerCt.getGridColumns();
overItemCls = me.overItemCls;
if (columns.length && index > -1) {
newRow = me.bufferRender([record], index)[0];
oldRow = me.all.item(index);
if (oldRow) {
oldRowDom = oldRow.dom;
isHovered = oldRow.hasCls(overItemCls);
var rowCls;
if (oldRowDom.mergeAttributes) {
rowCls = oldRowDom.className;
oldRowDom.mergeAttributes(newRow, true);
} else {
rowCls = oldRowDom.getAttribute('class');
newAttrs = newRow.attributes;
attLen = newAttrs.length;
for (i = 0; i < attLen; i++) {
attName = newAttrs[i].name;
if (attName !== 'id') {
oldRowDom.setAttribute(attName, newAttrs[i].value);
}
}
}
if (rowCls) {
oldRow.addCls(rowCls);
}
if (isHovered) {
oldRow.addCls(overItemCls);
}
oldCells = oldRow.query(me.cellSelector);
newCells = Ext.fly(newRow).query(me.cellSelector);
len = newCells.length;
row = oldCells[0].parentNode;
for (i = 0; i < len; i++) {
if (me.shouldUpdateCell(columns[i], changedFieldNames)) {
if (isEditing) {
Ext.fly(oldCells[i]).syncContent(newCells[i]);
}
else {
row.insertBefore(newCells[i], oldCells[i]);
row.removeChild(oldCells[i]);
}
}
}
}
me.fireEvent('itemupdate', record, index, newRow);
}
}
}
});
Ext.define('Shopware.model.Helper', {
getModelName: function (modelName) {
return modelName.substr(modelName.lastIndexOf(".") + 1);
},
getEventAlias: function (modelClass) {
return this.getModelName(modelClass).toLowerCase();
},
hasModelAction: function (model, action) {
return (model.proxy && model.proxy.api && model.proxy.api[action]);
},
camelCaseToWord: function (word) {
var newWord;
newWord = word.split(/(?=[A-Z])/).map(function (p) {
return p.charAt(0).toLowerCase() + p.slice(1);
}).join(' ');
return newWord.charAt(0).toUpperCase() + newWord.slice(1);
},
getHumanReadableWord: function(word) {
word = this.camelCaseToWord(word);
word = word.replace(' id', '');
return word;
},
getAssociations: function (className, conditions) {
var me = this,
associations = [],
model = Ext.create(className);
conditions = conditions || [];
if (model.associations.length <= 0) {
return associations;
}
Ext.each(model.associations.items, function (association) {
if (me.matchAssociationConditions(association, conditions)) {
associations.push(association);
}
});
return associations;
},
getAssociationStore: function (record, association) {
var store;
store = record[association.storeName];
if (!(store instanceof Ext.data.Store)) {
store = Ext.create('Ext.data.Store', {
model: association.associatedName
});
record[association.storeName] = store;
}
return store;
},
matchAssociationConditions: function (association, conditions) {
var associationInstance = Ext.create(association.associatedName),
match = false;
if (conditions && conditions.length <= 0) {
match = true;
}
Ext.each(conditions, function (condition) {
if (condition.associationKey && !Ext.Array.contains(condition.associationKey, association.associationKey)) {
return true;
}
if (Ext.isString(condition.relation) && !Ext.isString(association.relation)) {
return true;
}
if (condition.relation && condition.relation.toLowerCase() !== association.relation.toLowerCase()) {
return true;
}
if (condition.hasAssociations === true && associationInstance.associations.length <= 0) {
return true;
}
if (condition.hasAssociations === false && associationInstance.associations.length > 0) {
return true;
}
if (condition.associationTypes && associationInstance.association.length <= 0) {
return true;
}
if (condition.associationTypes) {
var typeMatch = false;
Ext.each(associationInstance.associations.items, function (item) {
Ext.each(condition.associationTypes, function (type) {
if (type.toLowerCase() === item.relation.toLowerCase()) {
typeMatch = true;
}
});
});
if (typeMatch === false) {
return true;
}
}
match = true;
return false;   //cancel foreach
});
return match;
},
applyIntegerColumnConfig: function (column) {
column.xtype = 'numbercolumn';
column.renderer = this.integerColumnRenderer;
column.align = 'right';
column.editor = this.applyIntegerFieldConfig({});
return column;
},
applyStringColumnConfig: function (column) {
column.editor = this.applyStringFieldConfig({});
return column;
},
applyBooleanColumnConfig: function (column) {
column.xtype = 'booleancolumn';
column.renderer = this.booleanColumnRenderer;
column.editor = this.applyBooleanFieldConfig({});
return column;
},
applyDateColumnConfig: function (column, format) {
column.xtype = 'datecolumn';
if (format) {
column.format = format;
}
column.editor = this.applyDateFieldConfig({});
return column;
},
applyFloatColumnConfig: function (column) {
column.xtype = 'numbercolumn';
column.align = 'right';
column.editor = this.applyFloatFieldConfig({});
return column;
},
booleanColumnRenderer: function (value) {
var checked = 'sprite-ui-check-box-uncheck';
if (value === true || value === 1) {
checked = 'sprite-ui-check-box';
}
return '<span style="display:block; margin: 0 auto; height:16px; width:16px;" class="' + checked + '"></span>';
},
integerColumnRenderer: function (value) {
return Ext.util.Format.number(value, '0');
},
applyIntegerFieldConfig: function (field) {
field.xtype = 'numberfield';
field.align = 'right';
return field;
},
applyStringFieldConfig: function (field) {
field.xtype = 'textfield';
return field;
},
applyBooleanFieldConfig: function (field) {
field.xtype = 'checkbox';
field.uncheckedValue = false;
field.inputValue = true;
return field;
},
applyDateFieldConfig: function (field) {
field.xtype = 'datefield';
field.format = 'd.m.Y';
return field;
},
applyFloatFieldConfig: function (field) {
field.xtype = 'numberfield';
field.align = 'right';
return field;
},
getComponentTypeOfAssociation: function(association) {
switch (association.relation.toLowerCase()) {
case 'onetoone':
return 'detail';
case 'onetomany':
return 'listing';
case 'manytomany':
return 'related';
case 'manytoone':
return 'field';
}
return false;
},
createAssociationSearchStore: function (model, associationKey, searchUrl) {
return Ext.create('Ext.data.Store', {
model: model,
proxy: {
type: 'ajax',
url: searchUrl,
reader: { type: 'application', root: 'data', totalProperty: 'total' },
extraParams: { association: associationKey }
}
});
},
getFieldByName: function(fields, name) {
var result = undefined;
Ext.each(fields, function(field) {
if (field.name == name) {
result = field;
return false;
}
});
return result;
},
throwException: function(message, title) {
title = title || "Shopware configuration error";
throw {
name: title,
message: message,
toString: function() { return this.name + ": " + this.message }
};
},
isLazyLoadingComponent: function(component) {
var me = this;
if (!(component.association)) {
return false;
}
if (!(component.association.lazyLoading)) {
return false;
}
if (typeof component.getStore !== 'function') {
return false;
}
if (component.getStore().getCount() > 0) {
return false;
}
return (component.getStore() instanceof Shopware.store.Association)
|| (me.hasModelAction(component.getStore(), 'read') !== undefined);
}
});
Ext.define('Shopware.grid.Controller', {
extend: 'Ext.app.Controller',
mixins: {
helper: 'Shopware.model.Helper'
},
deleteConfirmTitle: 'Einträge löschen',
deleteConfirmText: 'Bist Du sicher, dass Du die markierten Einträge löschen möchtest?',
deleteInfoText: '<b>Die Einträge werden gelöscht.</b> <br>Um den Prozess abzubrechen, kannst Du den <b><i>`Prozess abbrechen`</i></b> Button verwenden. Abhängig von der Datenmenge kann dieser Prozess einige Minuten in Anspruch nehmen.',
deleteProgressBarText: 'Eintrag [0] von [1]',
statics: {
displayConfig: {
gridClass: undefined,
eventAlias: undefined
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
constructor: function (opts) {
var me = this;
me._opts = me.statics().getDisplayConfig(opts, this);
me.callParent(arguments);
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
init: function () {
var me = this;
Shopware.app.Application.fireEvent(me.getEventName('before-init'), me);
if (me.$className !== 'Shopware.grid.Controller') {
me.checkRequirements();
}
if (me.getConfig('eventAlias') && me.getConfig('gridClass')) {
me.control(me.createControls());
me.registerEvents();
}
Shopware.app.Application.fireEvent(me.getEventName('after-init'), me);
me.callParent(arguments);
},
checkRequirements: function() {
var me = this;
if (!me.getConfig('eventAlias')) {
me.throwException(me.$className + ": Component requires the `eventAlias` property in the configure() function");
}
if (!me.getConfig('gridClass')) {
me.throwException(me.$className + ": Component requires the `gridClass` property in the configure() function");
}
},
reloadControls: function() {
var me = this;
me.checkRequirements();
me.control(me.createControls());
me.registerEvents();
},
registerEvents: function() {
var me = this;
this.addEvents(
me.getEventName('before-open-delete-window'),
me.getEventName('batch-delete-exception'),
me.getEventName('batch-delete-success'),
me.getEventName('after-selection-changed'),
me.getEventName('before-add-item'),
me.getEventName('before-search'),
me.getEventName('before-page-size-changed'),
me.getEventName('before-edit-item'),
me.getEventName('before-create-detail-window'),
me.getEventName('after-create-detail-window'),
me.getEventName('after-init'),
me.getEventName('after-create-controls'),
me.getEventName('after-create-listing-window-controls'),
me.getEventName('before-delete-items'),
me.getEventName('after-add-item'),
me.getEventName('after-search'),
me.getEventName('after-page-size-changed'),
me.getEventName('after-edit-item')
);
},
createControls: function () {
var me = this, alias, controls = {}, events = {};
alias = Ext.ClassManager.getAliasesByName(me.getConfig('gridClass'));
alias = alias[0];
alias = alias.replace('widget.', '');
controls[alias] = me.createListingWindowControls();
events['grid-' + me.getConfig('eventAlias') + '-batch-delete-item'] = me.onBatchDeleteItem;
controls['shopware-progress-window'] = events;
Shopware.app.Application.on('grid-' + me.getConfig('eventAlias') + '-batch-delete-item', function() {
me.onBatchDeleteItem.apply(me, arguments);
});
Shopware.app.Application.fireEvent(me.getEventName('after-create-controls'), me, controls);
return controls;
},
createListingWindowControls: function () {
var me = this, events = {}, alias;
alias = me.getConfig('eventAlias');
events[alias + '-selection-changed'] = me.onSelectionChanged;
events[alias + '-add-item'] = me.onAddItem;
events[alias + '-delete-item'] = me.onDeleteItem;
events[alias + '-delete-items'] = me.onDeleteItems;
events[alias + '-edit-item'] = me.onEditItem;
events[alias + '-search'] = me.onSearch;
events[alias + '-change-page-size'] = me.onChangePageSize;
Shopware.app.Application.fireEvent(me.getEventName('after-create-listing-window-controls'), me, events, alias);
return events;
},
onDeleteItems: function (grid, records, button) {
var me = this, window,
text = me.deleteConfirmText,
title = me.deleteConfirmTitle,
count = records.length;
if (!Shopware.app.Application.fireEvent('before-delete-items', me, records, grid, title, text)) {
return false;
}
Ext.MessageBox.confirm(title, text, function (response) {
if (response !== 'yes') {
return false;
}
if (!me.hasModelAction(records[0], 'destroy')) {
grid.getStore().remove(records);
return true;
}
window = Ext.create('Shopware.window.Progress', {
configure: function() {
return {
infoText: me.deleteInfoText,
subApp: me.subApplication,
tasks: [
{
text: me.deleteProgressBarText,
event: 'grid-' + me.getConfig('eventAlias') + '-batch-delete-item',
totalCount: records.length,
data: records
}
]
};
}
});
if (!Shopware.app.Application.fireEvent(me.getEventName('before-open-delete-window'), me, window, grid, records)) {
return false;
}
Shopware.app.Application.on('grid-process-done', function() {
me.reloadStoreAfterDelete(grid.getStore(), count);
}, me, { single: true });
window.show();
});
},
reloadStoreAfterDelete: function(store, itemCount) {
switch(true) {
case (store.data.length !== itemCount):
case store.currentPage === 1:
store.load();
return;
case store.currentPage > 1 && store.data.length === itemCount:
store.currentPage -= 1;
store.load();
return
}
},
onDeleteItem: function (grid, record) {
var me = this,
text = me.deleteConfirmText,
title = me.deleteConfirmTitle;
if (grid.getConfig('displayProgressOnSingleDelete')) {
me.onDeleteItems(grid, [ record ], null);
return;
}
Ext.MessageBox.confirm(title, text, function (response) {
if (response !== 'yes') {
return false;
}
if (!me.hasModelAction(record, 'destroy')) {
grid.getStore().remove(record);
return true;
}
record.destroy({
success: function (result, operation) {
me.reloadStoreAfterDelete(grid.getStore(), 1);
}
});
});
},
onBatchDeleteItem: function (task, record, callback) {
var me = this, proxy = record.getProxy(), data;
callback = callback || Ext.emptyFn;
proxy.on('exception', function (proxy, response, operation) {
data = Ext.decode(response.responseText);
operation.setException(data.error);
if (!Shopware.app.Application.fireEvent(me.getEventName('batch-delete-exception'), me, record, task, response, operation)) {
return false;
}
callback(response, operation);
}, me, { single: true });
record.destroy({
success: function (result, operation) {
if (!Shopware.app.Application.fireEvent(me.getEventName('batch-delete-success'), me, record, task, result, operation)) {
return false;
}
callback(result, operation);
}
});
},
onSelectionChanged: function (grid, selModel, selection) {
var me = this;
if (!(grid instanceof Ext.grid.Panel)) {
return false;
}
if (!grid.deleteButton) {
return false;
}
grid.deleteButton.setDisabled(selection.length <= 0);
return Shopware.app.Application.fireEvent(me.getEventName('after-selection-changed'), me, grid, selModel, selection);
},
onAddItem: function (listing, record) {
var me = this, store = listing.getStore(), window;
if (!(record instanceof Ext.data.Model)) {
record = Ext.create(store.model);
}
if (!Shopware.app.Application.fireEvent(me.getEventName('before-add-item'), me, listing, record)) {
return false;
}
me.checkRequirements();
window = me.createDetailWindow(
record,
listing.getConfig('detailWindow')
);
Shopware.app.Application.on(window.eventAlias + '-save-successfully', function() {
listing.getStore().load();
}, me);
Shopware.app.Application.fireEvent(me.getEventName('after-add-item'), me, window, record, listing);
return window;
},
onSearch: function (grid, searchField, value) {
var me = this, store = grid.getStore();
value = Ext.String.trim(value);
store.filters.clear();
store.currentPage = 1;
if (!Shopware.app.Application.fireEvent(me.getEventName('before-search'), me, grid, store, searchField, value)) {
return false;
}
if (!me.hasModelAction(store, 'read') || store.remoteFilter == false) {
me.localGridSearch(store, value);
return true;
}
store.on('load', function() {
Shopware.app.Application.fireEvent(me.getEventName('after-search'), me, grid, store, searchField, value);
}, me, { single: true });
if (value.length > 0) {
store.filter({ property: 'search', value: value });
} else {
store.load();
}
return true;
},
localGridSearch: function(store, term) {
var match = false;
term = Ext.String.trim(term.toLowerCase());
store.clearFilter();
if (term.length <= 0) {
return;
}
store.filterBy(function(item) {
match = false;
for (var key in item.data) {
var value = item.data[key];
if (Ext.isString(value) && match == false) {
var temp = value.toLowerCase();
match = temp.indexOf(term) > -1;
}
}
return match;
});
},
onChangePageSize: function (grid, combo, records) {
var me = this,
store = grid.getStore();
if (!Shopware.app.Application.fireEvent(me.getEventName('before-page-size-changed'), me, grid, combo, records)) {
return false;
}
if (combo.getValue() > 0) {
store.pageSize = combo.getValue();
store.currentPage = 1;
store.load();
}
return Shopware.app.Application.fireEvent(me.getEventName('after-page-size-changed'), me, grid, combo, records);
},
onEditItem: function (listing, record) {
var me = this, window;
if (!(record instanceof Ext.data.Model)) {
return false;
}
if (!Shopware.app.Application.fireEvent(me.getEventName('before-edit-item'), me, listing, record)) {
return false;
}
me.checkRequirements();
if (me.hasModelAction(record, 'detail')) {
record.reload({
callback: function (result) {
window = me.createDetailWindow(
result,
listing.getConfig('detailWindow')
);
Shopware.app.Application.on(window.eventAlias + '-save-successfully', function() {
listing.getStore().load();
}, me, { single: true });
Shopware.app.Application.fireEvent(me.getEventName('after-edit-item'), me, window, listing, record);
}
});
return true;
} else {
window = me.createDetailWindow(
record,
listing.getConfig('detailWindow')
);
Shopware.app.Application.on(window.eventAlias + '-save-successfully', function() {
listing.getStore().load();
}, me, { single: true });
Shopware.app.Application.fireEvent(me.getEventName('after-edit-item'), me, window, listing, record);
return true;
}
},
createDetailWindow: function (record, detailWindowClass) {
var me = this, window;
if (!detailWindowClass) {
return false;
}
if (!Shopware.app.Application.fireEvent(me.getEventName('before-create-detail-window'), me, record)) {
return false;
}
window = me.getView(detailWindowClass).create({
record: record
});
if (!Shopware.app.Application.fireEvent(me.getEventName('after-create-detail-window'), me, record, window)) {
return false;
}
if (window) {
window.show();
}
return window;
},
getEventName: function (name) {
return this.getConfig('eventAlias') + '-' + name;
}
});
Ext.define('Shopware.grid.Panel', {
extend: 'Ext.grid.Panel',
alias: 'widget.shopware-grid-panel',
mixins: {
helper: 'Shopware.model.Helper'
},
cls: 'shopware-grid-panel',
toolbar: undefined,
addButton: undefined,
deleteButton: undefined,
searchField: undefined,
pageSizeCombo: undefined,
pagingbar: undefined,
controller: undefined,
model: undefined,
eventAlias: undefined,
pageSizeLabel: 'Einträge pro Seite',
addButtonText: 'Hinzufügen',
deleteButtonText: 'Markierte Einträge löschen',
searchFieldText: 'Suche ...',
pagingItemText: 'Einträge',
statics: {
displayConfig: {
detailWindow: undefined,
eventAlias: undefined,
hasOwnController: false,
toolbar: true,
addButton: true,
deleteButton: true,
searchField: true,
pagingbar: true,
pageSize: true,
actionColumn: true,
editColumn: true,
deleteColumn: true,
rowNumbers: false,
rowEditing: false,
displayProgressOnSingleDelete: true,
columns: { },
showIdColumn: false
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
val = val || '';
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
constructor: function (opts) {
var me = this;
me._opts = me.statics().getDisplayConfig(opts, this);
me.callParent(arguments);
},
initComponent: function () {
var me = this;
me.checkRequirements();
me.model = me.store.model;
me.eventAlias = me.getConfig('eventAlias');
if (!me.eventAlias) me.eventAlias = me.getEventAlias(me.model.$className);
me.fieldAssociations = me.getAssociations(me.model.$className, [
{ relation: 'ManyToOne' }
]);
me.registerEvents();
me.fireEvent(me.eventAlias + '-before-init-component', me);
me.columns = me.createColumns();
me.plugins = me.createPlugins();
me.features = me.createFeatures();
me.selModel = me.createSelectionModel();
me.dockedItems = me.createDockedItems();
if (me.getConfig('hasOwnController') === false) {
me.createDefaultController();
}
me.fireEvent(me.eventAlias + '-after-init-component', me);
me.callParent(arguments);
},
checkRequirements: function() {
var me = this;
if (!(me.store instanceof Ext.data.Store)) {
me.throwException(me.$className + ': Component requires a configured store, which has to been passed in the class constructor.');
}
if (me.alias.length <= 0) {
me.throwException(me.$className + ': Component requires a configured Ext JS widget alias.');
}
if (me.alias.length === 1 && me.alias[0] === 'widget.shopware-grid-panel') {
me.throwException(me.$className + ': Component requires a configured Ext JS widget alias.');
}
},
createDefaultController: function () {
var me = this,
id = Ext.id();
me.controller = Ext.create('Shopware.grid.Controller', {
application: me.subApp,
subApplication: me.subApp,
subApp: me.subApp,
$controllerId: id,
id: id,
configure: function () {
return {
gridClass: me.$className,
eventAlias: me.eventAlias
};
}
});
me.controller.init();
me.subApp.controllers.add(me.controller.$controllerId, me.controller);
return me.controller;
},
destroy: function () {
var me = this;
if (!me.getConfig('hasOwnController') && me.controller) {
me.subApp.removeController(me.controller);
}
return me.callParent(arguments);
},
registerEvents: function () {
var me = this;
this.addEvents(
me.eventAlias + '-selection-changed',
me.eventAlias + '-add-item',
me.eventAlias + '-delete-item',
me.eventAlias + '-delete-items',
me.eventAlias + '-edit-item',
me.eventAlias + '-search',
me.eventAlias + '-change-page-size',
me.eventAlias + '-before-init-component',
me.eventAlias + '-after-init-component',
me.eventAlias + '-before-create-columns',
me.eventAlias + '-before-create-action-columns',
me.eventAlias + '-after-create-columns',
me.eventAlias + '-column-created',
me.eventAlias + '-action-column-created',
me.eventAlias + '-before-create-action-column-items',
me.eventAlias + '-after-create-action-column-items',
me.eventAlias + '-delete-action-column-created',
me.eventAlias + '-edit-action-column-created',
me.eventAlias + '-before-create-plugins',
me.eventAlias + '-after-create-plugins',
me.eventAlias + '-selection-model-created',
me.eventAlias + '-before-create-docked-items',
me.eventAlias + '-after-create-docked-items',
me.eventAlias + '-paging-bar-created',
me.eventAlias + '-page-size-combo-created',
me.eventAlias + '-before-create-page-sizes',
me.eventAlias + '-after-create-page-sizes',
me.eventAlias + '-toolbar-created',
me.eventAlias + '-before-create-toolbar-items',
me.eventAlias + '-before-create-right-toolbar-items',
me.eventAlias + '-after-create-toolbar-items',
me.eventAlias + '-add-button-created',
me.eventAlias + '-delete-button-created',
me.eventAlias + '-search-field-created',
me.eventAlias + '-before-reload-data',
me.eventAlias + '-after-reload-data',
me.eventAlias + '-before-create-features',
me.eventAlias + '-after-create-features'
);
},
createColumns: function () {
var me = this, model = null,
column = null,
configColumns = me.getConfig('columns'),
columns = [];
model = me.store.model.$className;
if (model.length > 0) {
model = Ext.create(model);
}
me.fireEvent(me.eventAlias + '-before-create-columns', me, columns);
if (me.getConfig('rowNumbers')) {
columns.push(me.createRowNumberColumn());
}
var keys = model.fields.keys;
if (Object.keys(configColumns).length > 0) keys = Object.keys(configColumns);
Ext.each(keys, function(key) {
var modelField = me.getFieldByName(model.fields.items, key);
column = me.createColumn(model, modelField);
if (column !== null) columns.push(column);
});
me.fireEvent(me.eventAlias + '-before-create-action-columns', me, columns);
if (me.getConfig('actionColumn')) {
column = me.createActionColumn();
if (column !== null) {
columns.push(column);
}
}
me.fireEvent(me.eventAlias + '-after-create-columns', me, columns);
return columns;
},
createColumn: function (model, field) {
var me = this, column = {}, config, customConfig;
if (model.idProperty === field.name && !me.getConfig('showIdColumn')) {
return null;
}
column.xtype = 'gridcolumn';
column.dataIndex = field.name;
column.header = me.getHumanReadableWord(field.name);
var fieldAssociation = me.getFieldAssociation(field.name);
if (fieldAssociation === undefined) {
switch (field.type.type) {
case 'int':
column = me.applyIntegerColumnConfig(column);
break;
case 'string':
column = me.applyStringColumnConfig(column);
break;
case 'bool':
column = me.applyBooleanColumnConfig(column);
break;
case 'date':
case 'datetime':
column = me.applyDateColumnConfig(column, field.dateFormat);
break;
case 'float':
column = me.applyFloatColumnConfig(column);
break;
}
} else {
column.association = fieldAssociation;
column.renderer = me.associationColumnRenderer;
}
config = me.getConfig('columns');
customConfig = config[field.name] || {};
if (Ext.isString(customConfig)) customConfig = { header: customConfig };
if (Ext.isObject(customConfig)) {
column = Ext.apply(column, customConfig);
} else if (Ext.isFunction(customConfig)) {
column = customConfig.call(this, model, column, field, fieldAssociation);
}
if (!column.flex && !column.width) {
column.flex = 1;
}
me.fireEvent(me.eventAlias + '-column-created', me, column, model, field);
return column;
},
createActionColumn: function () {
var me = this, items, column;
items = me.createActionColumnItems();
column = {
xtype: 'actioncolumn',
width: 30 * items.length,
items: items
};
me.fireEvent(me.eventAlias + '-action-column-created', me, column);
return column;
},
createActionColumnItems: function () {
var me = this, items = [];
me.fireEvent(me.eventAlias + '-before-create-action-column-items', me, items);
if (me.getConfig('deleteColumn')) {
items.push(me.createDeleteColumn());
}
if (me.getConfig('editColumn')) {
items.push(me.createEditColumn());
}
me.fireEvent(me.eventAlias + '-after-create-action-column-items', me, items);
return items;
},
createDeleteColumn: function () {
var me = this, column;
column = {
action: 'delete',
iconCls: 'sprite-minus-circle-frame',
handler: Ext.bind(me._onDelete, me)
};
me.fireEvent(me.eventAlias + '-delete-action-column-created', me, column);
return column;
},
createEditColumn: function () {
var me = this, column;
column = {
action: 'edit',
iconCls: 'sprite-pencil',
handler: Ext.bind(me._onEdit, me)
};
me.fireEvent(me.eventAlias + '-edit-action-column-created', me, column);
return column;
},
createRowNumberColumn: function () {
return { xtype: 'rownumberer', width: 30 };
},
createPlugins: function () {
var me = this, items = [];
me.fireEvent(me.eventAlias + '-before-create-plugins', me, items);
if (me.getConfig('rowEditing')) {
me.rowEditor = Ext.create('Ext.grid.plugin.RowEditing', {
clicksToEdit: 2
});
items.push(me.rowEditor);
}
me.fireEvent(me.eventAlias + '-after-create-plugins', me, items);
return items;
},
createFeatures: function () {
var me = this, items = [];
me.fireEvent(me.eventAlias + '-before-create-features', me, items);
me.fireEvent(me.eventAlias + '-after-create-features', me, items);
return items;
},
createSelectionModel: function () {
var me = this, selModel;
selModel = Ext.create('Ext.selection.CheckboxModel', {
listeners: {
selectionchange: Ext.bind(me.onSelectionChange, me)
}
});
me.fireEvent(me.eventAlias + '-selection-model-created', me, selModel);
return selModel;
},
createDockedItems: function () {
var me = this, items = [];
me.fireEvent(me.eventAlias + '-before-create-docked-items', me, items);
if (me.getConfig('toolbar')) {
items.push(me.createToolbar());
}
if (me.getConfig('pagingbar')) {
items.push(me.createPagingbar());
}
me.fireEvent(me.eventAlias + '-after-create-docked-items', me, items);
return items;
},
createPagingbar: function () {
var me = this;
me.pagingbar = Ext.create('Ext.toolbar.Paging', {
store: me.store,
dock: 'bottom',
displayInfo: true
});
if (me.getConfig('pageSize')) {
var pageSizeCombo = me.createPageSizeCombo();
me.pagingbar.add(pageSizeCombo, { xtype: 'tbspacer', width: 6 });
}
me.fireEvent(me.eventAlias + '-paging-bar-created', me, me.pagingbar);
return me.pagingbar;
},
createPageSizeCombo: function () {
var me = this, value = 20;
if (me.store) {
value = me.store.pageSize;
}
me.pageSizeCombo = Ext.create('Ext.form.field.ComboBox', {
fieldLabel: me.pageSizeLabel,
labelWidth: 110,
cls: 'page-size-combo',
queryMode: 'local',
value: value,
width: 220,
store: Ext.create('Ext.data.Store', {
fields: [ 'value', 'name' ],
data: me.createPageSizes()
}),
displayField: 'name',
valueField: 'value',
listeners: {
select: function (combo, records) {
me.fireEvent(me.eventAlias + '-change-page-size', me, combo, records);
}
}
});
me.fireEvent(me.eventAlias + '-page-size-combo-created', me, me.pageSizeCombo);
return me.pageSizeCombo;
},
createPageSizes: function () {
var me = this, data = [];
me.fireEvent(me.eventAlias + '-before-create-page-sizes', me, data);
for (var i = 1; i <= 10; i++) {
var count = i * 20;
data.push({ value: count, name: count + ' ' + me.pagingItemText });
}
me.fireEvent(me.eventAlias + '-after-create-page-sizes', me, data);
return data;
},
createToolbar: function () {
var me = this;
me.toolbar = Ext.create('Ext.toolbar.Toolbar', {
dock: 'top',
ui: 'shopware-ui',
items: me.createToolbarItems()
});
me.fireEvent(me.eventAlias + '-toolbar-created', me, me.toolbar);
return me.toolbar;
},
createToolbarItems: function () {
var me = this, items = [];
me.fireEvent(me.eventAlias + '-before-create-toolbar-items', me, items);
if (me.getConfig('addButton')) {
items.push(me.createAddButton());
}
if (me.getConfig('deleteButton')) {
items.push(me.createDeleteButton());
}
me.fireEvent(me.eventAlias + '-before-create-right-toolbar-items', me, items);
if (me.getConfig('searchField')) {
items.push('->');
items.push(me.createSearchField());
}
me.fireEvent(me.eventAlias + '-after-create-toolbar-items', me, items);
return items;
},
createAddButton: function () {
var me = this;
me.addButton = Ext.create('Ext.button.Button', {
text: me.addButtonText,
iconCls: 'sprite-plus-circle-frame',
handler: Ext.bind(me.onAddItem, me)
});
me.fireEvent(me.eventAlias + '-add-button-created', me, me.addButton);
return me.addButton;
},
createNewRecord: function() {
return Ext.create(this.store.model);
},
createDeleteButton: function () {
var me = this;
me.deleteButton = Ext.create('Ext.button.Button', {
text: me.deleteButtonText,
disabled: true,
iconCls: 'sprite-minus-circle-frame',
handler: Ext.bind(me._onMultiDelete, me)
});
me.fireEvent(me.eventAlias + '-delete-button-created', me, me.deleteButton);
return me.deleteButton;
},
createSearchField: function () {
var me = this;
me.searchField = Ext.create('Ext.form.field.Text', {
cls: 'searchfield',
width: 170,
emptyText: me.searchFieldText,
enableKeyEvents: true,
checkChangeBuffer: 500,
listeners: {
change: function (field, value) {
me.searchEvent(field, value);
}
}
});
me.fireEvent(me.eventAlias + '-search-field-created', me, me.searchField);
return me.searchField;
},
searchEvent: function(field, value) {
var me = this;
me.fireEvent(me.eventAlias + '-search', me, field, value);
},
reloadData: function(store, record) {
var me = this;
if (store instanceof Ext.data.Store) {
if (!me.fireEvent(me.eventAlias + '-before-reload-data', me, store, record)) {
return false;
}
me.reconfigure(store);
me.fireEvent(me.eventAlias + '-after-reload-data', me, store, record);
}
},
getFieldAssociation: function(fieldName) {
var me = this, fieldAssociation = undefined;
Ext.each(me.fieldAssociations, function(association) {
if (association.field === fieldName) {
fieldAssociation = association;
return false;
}
});
return fieldAssociation;
},
associationColumnRenderer: function(value, metaData, record, rowIndex, colIndex) {
var column = this.columns[colIndex], result;
if (!column.association) {
return value;
}
var associationStore = record[column.association.storeName];
if (!(associationStore instanceof Ext.data.Store) || associationStore.getCount() <= 0) {
return value;
}
var associationRecord = associationStore.first();
if (!(associationRecord instanceof Ext.data.Model)) {
return value;
}
result = associationRecord.get('name');
if (result) return result;
result = associationRecord.get('description');
if (result) return result;
return value;
},
onAddItem: function() {
var me = this;
me.fireEvent(me.eventAlias + '-add-item', me, me.createNewRecord());
},
_onMultiDelete: function () {
var me = this;
var selModel = me.getSelectionModel();
me.fireEvent(me.eventAlias + '-delete-items', me, selModel.getSelection(), this);
},
onSelectionChange: function(selModel, selection) {
var me = this;
return me.fireEvent(me.eventAlias + '-selection-changed', me, selModel, selection);
},
_onDelete: function (view, rowIndex, colIndex, item, opts, record) {
var me = this;
me.fireEvent(me.eventAlias + '-delete-item', me, record, rowIndex, colIndex, item, opts);
},
_onEdit: function (view, rowIndex, colIndex, item, opts, record) {
var me = this;
me.fireEvent(me.eventAlias + '-edit-item', me, record, rowIndex, colIndex, item, opts);
}
});
Ext.define('Shopware.data.Model', {
extend: 'Ext.data.Model',
proxy: {
type: 'ajax',
reader: {
type: 'application'
}
},
statics: {
displayConfig: {
controller: undefined,
listing: 'Shopware.grid.Panel',
detail: 'Shopware.model.Container',
related: 'Shopware.grid.Association',
field: 'Shopware.form.field.Search',
proxy: {
type: 'ajax',
api: {
detail: '/stageware12/backend/base/detail',
create: '/stageware12/backend/base/create',
update: '/stageware12/backend/base/update',
destroy: '/stageware12/backend/base/delete'
},
reader: {
type: 'application',
root: 'data',
totalProperty: 'total'
}
}
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
constructor: function (config) {
var me = this;
me._opts = me.statics().getDisplayConfig(config, this);
me.convertProxyApi();
me.callParent(arguments);
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
convertProxyApi: function () {
var me = this, value;
if (!me.getConfig('controller')) {
return;
}
me.setProxy(me.getConfig('proxy'));
Object.keys(me.proxy.api).forEach(function (key) {
value = me.proxy.api[key] + '';
value = value.replace(
'/backend/base/', '/backend/' + me.getConfig('controller') + '/'
);
me.proxy.api[key] = value;
});
},
reload: function (options) {
var me = this, proxy = me.proxy, callback = null;
if (!Ext.isString(proxy.api.detail)) {
if (options && Ext.isFunction(options.callback)) {
options.callback(me);
} else {
return this;
}
}
proxy.api.read = proxy.api.detail;
var store = Ext.create('Ext.data.Store', {
model: (typeof me.__proto__ === 'object') ? me.__proto__.$className : me.modelName,
proxy: me.proxy
});
store.getProxy().extraParams = me.getReloadExtraParams();
if (options && Ext.isFunction(options.callback)) {
callback = options.callback;
}
options.callback = function (records, operation) {
var record = records[0];
if (Ext.isFunction(callback)) {
callback(record, operation);
}
};
try {
store.load(options);
} catch (e) {
return e;
}
},
getReloadExtraParams: function() {
var me = this;
return {
id: me.get('id')
}
}
});
Ext.define('Shopware.store.Listing', {
extend: 'Ext.data.Store',
mixins: {
helper: 'Shopware.model.Helper'
},
autoLoad: false,
batch: true,
remoteSort: true,
remoteFilter: true,
pageSize: 20,
statics: {
displayConfig: {
controller: undefined,
proxy: {
type: 'ajax',
api: {
read: '/stageware12/backend/base/list'
},
reader: {
type: 'application',
root: 'data',
totalProperty: 'total'
}
}
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
constructor: function (config) {
var me = this;
me._opts = me.statics().getDisplayConfig(config, this);
me.convertProxyApi();
me.callParent(arguments);
},
convertProxyApi: function () {
var me = this, value;
me.checkRequirements();
me.setProxy(me.getConfig('proxy'));
Object.keys(me.proxy.api).forEach(function (key) {
value = me.proxy.api[key] + '';
value = value.replace(
'/backend/base/', '/backend/' + me.getConfig('controller') + '/'
);
me.proxy.api[key] = value;
});
},
checkRequirements: function() {
var me = this;
if (!me.getConfig('controller')) {
me.throwException(me.$className + ": Component requires the `controller` property in the configure() function.");
}
}
});
Ext.define('Shopware.window.Detail', {
extend: 'Enlight.app.Window',
layout: {
type: 'hbox',
align: 'stretch'
},
mixins: {
helper: 'Shopware.model.Helper'
},
width: 990,
height: '90%',
alias: 'widget.shopware-window-detail',
associationComponents: [],
eventAlias: undefined,
record: undefined,
controller: undefined,
tabPanel: undefined,
formPanel: undefined,
toolbar: undefined,
cancelButton: undefined,
saveButton: undefined,
cancelButtonText: 'Abbrechen',
saveButtonText: 'Speichern',
statics: {
displayConfig: {
eventAlias: undefined,
associations: [],
hasOwnController: false,
translationKey: null
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
constructor: function (opts) {
var me = this;
me._opts = me.statics().getDisplayConfig(opts, this);
me.callParent(arguments);
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
initComponent: function () {
var me = this;
me.checkRequirements();
me.associationComponents = [];
me.eventAlias = me.getConfig('eventAlias');
if (!me.eventAlias) me.eventAlias = me.getEventAlias(me.record.$className);
me.items = [ me.createFormPanel() ];
me.dockedItems = me.createDockedItems();
if (me.getConfig('hasOwnController') === false) {
me.createDefaultController();
}
me.callParent(arguments);
me.loadRecord(me.record);
},
checkRequirements: function() {
var me = this;
if (!(me.record instanceof Shopware.data.Model)) {
me.throwException(me.$className + ": Component requires a passed Shopware.data.Model in the `record` property.");
}
if (me.alias.length <= 0) {
me.throwException(me.$className + ": Component requires a configured Ext JS widget alias.");
}
if (me.alias.length === 1 && me.alias[0] === 'widget.shopware-window-detail') {
me.throwException(me.$className + ": Component requires a configured Ext JS widget alias.");
}
},
registerEvents: function() {
var me = this;
me.addEvents(
me.getEventName('before-tab-changed'),
me.getEventName('after-tab-changed'),
me.getEventName('before-load-record'),
me.getEventName('after-load-record'),
me.getEventName('save'),
me.getEventName('before-load-lazy-loading-component'),
me.getEventName('after-load-lazy-loading-component'),
me.getEventName('before-load-associations'),
me.getEventName('after-load-associations'),
me.getEventName('before-load-association-component'),
me.getEventName('after-load-association-component'),
me.getEventName('before-create-toolbar-items'),
me.getEventName('after-create-toolbar-items'),
me.getEventName('before-create-tab-item'),
me.getEventName('after-create-tab-item'),
me.getEventName('before-create-tab-items'),
me.getEventName('after-create-tab-items')
);
},
createDefaultController: function () {
var me = this,
id = Ext.id();
me.controller = Ext.create('Shopware.detail.Controller', {
application: me.subApp,
subApplication: me.subApp,
subApp: me.subApp,
$controllerId: id,
id: id,
configure: function () {
return {
detailWindow: me.$className,
eventAlias: me.eventAlias
}
}
});
me.controller.init();
me.subApp.controllers.add(me.controller.$controllerId, me.controller);
return me.controller;
},
destroy: function () {
var me = this;
if (!me.getConfig('hasOwnController') && me.controller) {
me.subApp.removeController(me.controller);
}
return me.callParent(arguments);
},
createFormPanel: function () {
var me = this, items;
items = me.createTabItems();
if (items.length > 1) {
me.tabPanel = Ext.create('Ext.tab.Panel', {
flex: 1,
items: items,
listeners: {
tabchange: function (tabPanel, newCard, oldCard, eOpts) {
me.onTabChange(tabPanel, newCard, oldCard, eOpts);
}
}
});
items = [ me.tabPanel ];
}
var plugins = [];
if (me.getConfig('translationKey')) {
plugins.push({
pluginId: 'translation',
ptype: 'translation',
translationType: me.getConfig('translationKey')
});
}
me.formPanel = Ext.create('Ext.form.Panel', {
items: items,
flex: 1,
plugins: plugins,
defaults: {
cls: 'shopware-form'
},
layout: {
type: 'hbox',
align: 'stretch'
}
});
return me.formPanel;
},
createTabItems: function () {
var me = this, item, items = [];
if (!me.fireEvent(me.getEventName('before-create-tab-items'), me, items)) {
return [];
}
Ext.each(me.getTabItemsAssociations(), function (association) {
item = me.createTabItem(association);
if (item) items.push(item);
});
me.fireEvent(me.getEventName('after-create-tab-items'), me, items);
return items;
},
getTabItemsAssociations: function () {
var me = this, associations, config = me.getConfig('associations') || [];
associations = me.getAssociations(me.record.$className, [
{ associationKey: config }
]);
associations = Ext.Array.insert(associations, 0, [
{  isBaseRecord: true, associationKey: 'baseRecord' }
]);
return associations;
},
createTabItem: function (association) {
var me = this, item;
if (!me.fireEvent(me.getEventName('before-create-tab-item'), me, association)) {
return false;
}
if (association.isBaseRecord) {
item = me.createAssociationComponent('detail', me.record, null, null, me.record);
} else {
item = me.createAssociationComponent(
me.getComponentTypeOfAssociation(association),
Ext.create(association.associatedName),
me.getAssociationStore(me.record, association),
association,
me.record
);
}
me.associationComponents[association.associationKey] = item;
me.fireEvent(me.getEventName('after-create-tab-item'), me, association, item);
if (item.title === undefined) {
item.title = me.getModelName(association.associatedName);
}
return item;
},
createAssociationComponent: function(type, model, store, association, baseRecord) {
var me = this, component = { };
if (!(model instanceof Shopware.data.Model)) {
me.throwException(model.$className + ' has to be an instance of Shopware.data.Model');
}
if (baseRecord && !(baseRecord instanceof Shopware.data.Model)) {
me.throwException(baseRecord.$className + ' has to be an instance of Shopware.data.Model');
}
var componentType = model.getConfig(type);
if (!me.fireEvent(me.getEventName('before-association-component-created'), me, component, type, model, store)) {
return component;
}
component = Ext.create(componentType, {
record: model,
store: store,
flex: 1,
subApp: this.subApp,
association: association,
configure: function() {
var config = { };
if (association) {
config.associationKey = association.associationKey;
}
if (baseRecord && baseRecord.getConfig('controller')) {
config.controller = baseRecord.getConfig('controller');
}
return config;
}
});
component.on('viewready', function() {
if (me.isLazyLoadingComponent(component)) {
if (!(me.fireEvent(me.getEventName('before-load-lazy-loading-component'), me, component))) {
return true;
}
component.getStore().load({
callback: function(records, operation) {
me.fireEvent(me.getEventName('after-load-lazy-loading-component'), me, component, records, operation);
}
});
}
});
me.fireEvent(me.getEventName('after-association-component-created'), me, component, type, model, store);
return component;
},
createDockedItems: function () {
var me = this;
return [
me.createToolbar()
];
},
createToolbar: function () {
var me = this;
me.toolbar = Ext.create('Ext.toolbar.Toolbar', {
items: me.createToolbarItems(),
dock: 'bottom'
});
return me.toolbar;
},
createToolbarItems: function() {
var me = this, items = [];
me.fireEvent(me.getEventName('before-create-toolbar-items'), me, items);
items.push({ xtype: 'tbfill' });
items.push(me.createCancelButton());
items.push(me.createSaveButton());
me.fireEvent(me.getEventName('after-create-toolbar-items'), me, items);
return items;
},
createCancelButton: function () {
var me = this;
me.cancelButton = Ext.create('Ext.button.Button', {
cls: 'secondary',
name: 'cancel-button',
text: me.cancelButtonText,
handler: function () {
me.onCancel();
}
});
return me.cancelButton;
},
createSaveButton: function () {
var me = this;
me.saveButton = Ext.create('Ext.button.Button', {
cls: 'primary',
name: 'detail-save-button',
text: me.saveButtonText,
handler: function () {
me.onSave();
}
});
return me.saveButton;
},
loadRecord: function (record) {
var me = this;
if (!(me.fireEvent(me.getEventName('before-load-record'), me, record))) {
return false;
}
if (this.formPanel instanceof Ext.form.Panel) {
this.formPanel.loadRecord(record);
}
me.fireEvent(me.getEventName('after-load-record'), me, record);
this.loadAssociationData(record);
},
loadAssociationData: function(record) {
var me = this, association, component, store;
if (!(me.fireEvent(me.getEventName('before-load-associations'), me, record))) {
return false;
}
Object.keys(me.associationComponents).forEach(function(key) {
component = me.associationComponents[key];
store = null;
association = null;
if (key != 'baseRecord') {
association = me.getAssociations(record.$className, [ { associationKey: [ key ] } ]);
store = me.getAssociationStore(record, association[0]);
}
if (!(me.fireEvent(me.getEventName('before-load-association-component'), me, record, component, store, association))) {
return true;
}
if (component && typeof component.reloadData === 'function') {
component.reloadData(
store,
record
);
}
if (me.isLazyLoadingComponent(component)) {
component.getStore().load();
}
me.fireEvent(me.getEventName('after-load-association-component'), me, record, component, store, association);
});
me.fireEvent(me.getEventName('after-load-associations'), me, record);
},
onTabChange: function (tabPanel, newCard, oldCard, eOpts) {
var me = this;
if (!(me.fireEvent(me.getEventName('before-tab-changed'), me, tabPanel, newCard, oldCard, eOpts))) {
return false;
}
me.fireEvent(me.getEventName('after-tab-changed'), me, tabPanel, newCard, oldCard, eOpts);
},
onSave: function () {
this.fireEvent(
this.getEventName('save'), this, this.record
);
},
onCancel: function () {
this.destroy();
},
getEventName: function (name) {
return this.eventAlias + '-' + name;
},
});
Ext.define('Shopware.window.Listing', {
extend: 'Enlight.app.Window',
mixins: {
helper: 'Shopware.model.Helper'
},
layout: 'border',
width: 990,
height: '50%',
alias: 'widget.shopware-window-listing',
eventAlias: undefined,
listingStore: undefined,
gridPanel: undefined,
statics: {
displayConfig: {
listingGrid: undefined,
listingStore: undefined,
eventAlias: undefined,
extensions: [ ]
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
constructor: function (opts) {
var me = this;
me._opts = me.statics().getDisplayConfig(opts, this);
me.callParent(arguments);
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
initComponent: function () {
var me = this;
me.checkRequirements();
me.listingStore = me.createListingStore();
me.eventAlias = me.getConfig('eventAlias');
if (!me.eventAlias) me.eventAlias = me.getEventAlias(me.listingStore.model.$className);
me.registerEvents();
me.fireEvent(me.eventAlias + '-before-init-component', me);
me.items = me.createItems();
me.fireEvent(me.eventAlias + '-after-init-component', me);
me.callParent(arguments);
},
checkRequirements: function() {
var me = this;
if (me.alias.length <= 0) {
me.throwException(me.$className + ": Component requires a configured Ext JS widget alias.");
}
if (me.alias.length === 1 && me.alias[0] === 'widget.shopware-window-listing') {
me.throwException(me.$className + ": Component requires a configured Ext JS widget alias.");
}
if (!me.getConfig('listingGrid')) {
me.throwException(me.$className + ": Component requires the configured `listingGrid` property in the configure() function.");
}
if (!me.getConfig('listingStore')) {
me.throwException(me.$className + ": Component requires the configured `listingStore` property in the configure() function.");
}
},
registerEvents: function() {
var me = this;
me.addEvents(
me.eventAlias + '-before-init-component',
me.eventAlias + '-before-create-items',
me.eventAlias + '-after-create-items',
me.eventAlias + '-after-extensions-loaded',
me.eventAlias + '-after-create-grid-panel',
me.eventAlias + '-after-init-component'
);
},
createListingStore: function() {
var me = this;
return Ext.create(this.getConfig('listingStore'));
},
createItems: function () {
var me = this, items = [];
me.fireEvent(me.eventAlias + '-before-create-items', me, items);
items.push(me.createGridPanel());
me.fireEvent(me.eventAlias + '-after-create-items', me, items);
Ext.each(me.getConfig('extensions'), function(extension) {
if (!extension) return true;
if (Ext.isString(extension)) extension = { xtype: extension };
extension.listingWindow = me;
items.push(extension);
});
me.fireEvent(me.eventAlias + '-after-extensions-loaded', me, items);
return items;
},
createGridPanel: function () {
var me = this;
me.listingStore.load();
me.gridPanel = Ext.create(me.getConfig('listingGrid'), {
store: me.listingStore,
flex: 1,
subApp: me.subApp
});
me.fireEvent(me.eventAlias + '-after-create-grid-panel', me, me.gridPanel);
return me.gridPanel;
}
});
Ext.define('Shopware.window.Progress', {
extend: 'Ext.window.Window',
title: 'Einträge löschen',
alias: 'widget.shopware-progress-window',
layout: {
type: 'vbox',
align: 'stretch'
},
width: 600,
modal: true,
bodyPadding: 20,
height: 360,
closable: false,
cancelProcess: false,
cancelButton: undefined,
closeButton: undefined,
resultStore: undefined,
resultGrid: undefined,
resultFieldSet: undefined,
cancelButtonText: 'Prozess abbrechen',
closeButtonText: 'Fenster schließen',
successHeader: 'Erfolgreich',
requestHeader: 'Request',
errorHeader: 'Fehlermeldung',
requestResultTitle: 'Request Ergebnis',
processCanceledText: 'Prozess wurde an Position [0] von [1] unterbrochen',
statics: {
displayConfig: {
infoText: undefined,
tasks: [ ],
outputProperties: [ 'id', 'number', 'name' ],
displayResultGrid: true
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
constructor: function (opts) {
var me = this;
me._opts = me.statics().getDisplayConfig(opts, this);
me.callParent(arguments);
},
initComponent: function () {
var me = this;
me.registerEvents();
me.fireEvent('before-init-component', me);
me.cancelProcess = false;
me.items = me.createItems();
me.dockedItems = [ me.createToolbar() ];
me.fireEvent('after-init-component', me);
me.callParent(arguments);
me.fireEvent('before-start-sequential-process', me);
me.sequentialProcess(undefined, me.getConfig('tasks'));
},
registerEvents: function() {
var me = this;
me.addEvents(
'before-init-component',
'after-init-component',
'before-start-sequential-process',
'before-create-items',
'after-create-items',
'before-create-toolbar',
'after-create-toolbar',
'before-create-toolbar-items',
'after-create-toolbar-fill-item',
'after-create-toolbar-items',
'before-result-field-set-created',
'after-result-grid-created',
'after-result-field-set-created',
'task-toolbar-created',
'grid-process-done'
);
},
createItems: function () {
var me = this, items = [], item;
var tasks = me.getConfig('tasks');
if (!me.fireEvent('before-create-items', me, items)) {
return items;
}
if (me.getConfig('infoText')) {
items.push(me.createInfoText());
}
Ext.each(tasks, function (task) {
item = me.createTaskProgressBar(task);
if (item) {
items.push(item);
}
});
if (me.getConfig('displayResultGrid')) {
items.push(me.createResultFieldSet());
}
me.fireEvent('after-create-items', me, items);
return items;
},
createToolbar: function () {
var me = this, toolbar = null;
if (!me.fireEvent('before-create-toolbar', me, toolbar)) {
return toolbar;
}
me.toolbar = Ext.create('Ext.toolbar.Toolbar', {
dock: 'bottom',
items: me.createToolbarItems()
});
me.fireEvent('after-create-toolbar', me, me.toolbar);
return me.toolbar;
},
createToolbarItems: function() {
var me = this, items = [];
if (!me.fireEvent('before-create-toolbar-items', me, items)) {
return items;
}
me.cancelButton = Ext.create('Ext.button.Button', {
cls: 'secondary',
text: me.cancelButtonText,
handler: Ext.bind(me.onCancelProgress, me)
});
me.closeButton = Ext.create('Ext.button.Button', {
cls: 'secondary',
text: me.closeButtonText,
disabled: true,
handler: function() {
me.destroy();
}
});
items.push('->');
me.fireEvent('after-create-toolbar-fill-item', me, items);
items.push(me.cancelButton);
items.push(me.closeButton);
me.fireEvent('after-create-toolbar-items', me, items);
return items;
},
createResultFieldSet: function () {
var me = this, fieldSet = null;
if (!me.fireEvent('before-result-field-set-created', me, fieldSet)) {
return fieldSet;
}
me.resultGrid = me.createResultGrid();
me.fireEvent('after-result-grid-created', me, me.resultGrid);
me.resultFieldSet = Ext.create('Ext.form.FieldSet', {
items: [ me.resultGrid ],
layout: 'fit',
collapsible: true,
collapsed: false,
flex: 1,
margin: '20 0 0',
title: me.requestResultTitle
});
me.fireEvent('after-result-field-set-created', me, me.resultFieldSet);
return me.resultFieldSet;
},
createResultGrid: function() {
var me = this;
me.resultStore = me.createResultStore();
return Ext.create('Ext.grid.Panel', {
border: false,
columns: me.createResultGridColumns(),
store: me.resultStore
});
},
createResultStore: function() {
return Ext.create('Ext.data.Store', {
model: 'Shopware.model.DataOperation'
});
},
createResultGridColumns: function() {
var me = this;
return [
{ xtype: 'rownumberer', width: 30 },
{ header: me.successHeader, dataIndex: 'success', width: 60, renderer: me.successRenderer },
{ header: me.requestHeader, dataIndex: 'request', flex: 1, renderer: me.requestRenderer, scope: me },
{ header: me.errorHeader, dataIndex: 'error', flex: 1 }
];
},
createInfoText: function () {
return Ext.create('Ext.container.Container', {
html: this.getConfig('infoText'),
style: 'line-height:20px;'
});
},
createTaskProgressBar: function (task) {
var me = this;
task.progressBar = Ext.create('Ext.ProgressBar', {
animate: true,
text: Ext.String.format(task.text, 0, task.totalCount),
value: 0,
height: 20,
margin: '15 0 0'
});
me.fireEvent('task-toolbar-created', me, task, task.progressBar);
return task.progressBar;
},
sequentialProcess: function (current, tasks) {
var me = this, record;
if (current == undefined && tasks.length > 0) {
current = tasks.shift();
}
if (current.data && current.data.length <= 0) {
current = tasks.shift();
}
if (!current || me.cancelProcess) {
me.closeButton.enable();
me.cancelButton.disable();
if (me.cancelProcess) {
me.updateProgressBar(current, me.processCanceledText);
}
Shopware.app.Application.fireEvent('grid-process-done', me, current, me.cancelProcess);
return false;
}
if (!current.hasOwnProperty('totalCount')) current.totalCount = current.data.length;
record = current.data.shift();
me.updateProgressBar(current, current.text);
Shopware.app.Application.fireEvent(current.event, current, record, function(result, operation) {
if (!me.getConfig('displayResultGrid')) {
me.sequentialProcess(current, tasks);
}
var responseRecord = me.createResponseRecord(result, operation);
me.resultStore.add(responseRecord);
if (!responseRecord.get('success')) {
me.resultFieldSet.expand();
}
me.sequentialProcess(current, tasks);
});
return true;
},
updateProgressBar: function(task, text) {
var index = task.totalCount - task.data.length;
task.progressBar.updateProgress(
index / task.totalCount,
Ext.String.format(text, index, task.totalCount),
true
);
},
createResponseRecord: function(result, operation) {
var success = false, error = '', request, data = { };
if (Ext.isObject(result) && result.hasOwnProperty('responseText')) {
data = Ext.decode(result.responseText);
}
if (data.hasOwnProperty('success')) {
success = data.success;
} else if (Ext.isObject(operation) && operation.hasOwnProperty('wasSuccessful')) {
success = operation.wasSuccessful();
} else if (Ext.isObject(operation) && operation.hasOwnProperty('success')) {
success = operation.success;
} else if (Ext.isObject(result) && result.hasOwnProperty('success')) {
success = result.success;
} else if (Ext.isObject(result) && result.hasOwnProperty('status')) {
success = (result.status === 200);
}
if (data.hasOwnProperty('error')) {
error = data.error;
} else if (Ext.isObject(operation) && operation.hasOwnProperty('getError')) {
error = operation.getError();
} else if (Ext.isObject(operation) && operation.hasOwnProperty('error')) {
error = operation.error;
}
if (Ext.isObject(operation) && operation.hasOwnProperty('request')) {
request = operation.request;
} else if (Ext.isObject(result) && result.hasOwnProperty('request')) {
request = result.request;
}
return Ext.create('Shopware.model.DataOperation', {
success: success,
error: error,
request: request,
operation: operation
});
},
successRenderer: function(value, metaData) {
metaData.tdAttr = 'style="vertical-align: middle;"';
var css = 'sprite-cross-small';
if (value) {
css = 'sprite-tick-small'
}
return '<span style="display:block; margin: 0 auto; height:16px; width:16px;" class="' + css + '"></span>';
},
requestRenderer: function(value, metaData, record) {
var me = this, operation, propertyValue,
params = [], requestRecord,
url,
properties = me.getConfig('outputProperties');
operation = record.get('operation');
if (Ext.isObject(operation) && operation.hasOwnProperty('getRecords')) {
requestRecord = operation.getRecords();
requestRecord = requestRecord[0];
}
if (Ext.isObject(value) && value.hasOwnProperty('url')) {
url = value.url;
} else if (Ext.isObject(value)
&& value.hasOwnProperty('options')
&& value.options.hasOwnProperty('url')) {
url = value.options.url;
}
params.push('<strong>url</strong> = ' + url);
if (requestRecord) {
Ext.each(properties, function(property) {
propertyValue = requestRecord.get(property);
if (propertyValue) {
params.push('<strong>' + property + '</strong> = ' + propertyValue);
}
});
}
return params.join('<br>');
},
onCancelProgress: function () {
this.cancelProcess = true;
}
});
Ext.define('Shopware.model.DataOperation', {
extend: 'Ext.data.Model',
phantom: true,
fields: [
{ name: 'success', type: 'boolean' },
{ name: 'request' },
{ name: 'error', type: 'string' },
{ name: 'operation' },
]
});
Ext.define('Shopware.grid.Association', {
extend: 'Shopware.grid.Panel',
alias: 'widget.shopware-grid-association',
searchStore: undefined,
searchComboBox: undefined,
searchComboLabel: 'Suche nach',
statics: {
displayConfig: {
controller: undefined,
associationKey: undefined,
searchUrl: '/stageware12/backend/base/searchAssociation',
searchCombo: true,
pagingbar: false,
editColumn: false
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
if (config.controller) {
config.searchUrl = config.searchUrl.replace(
'/backend/base/', '/backend/' + config.controller + '/'
);
}
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
val = val || '';
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
constructor: function (opts) {
var me = this, args;
me._opts = me.statics().getDisplayConfig(opts, this);
args = arguments;
opts.configure = function() {
return me._opts;
};
me.callParent(args);
},
checkRequirements: function() {
var me = this;
if (!(me.store instanceof Ext.data.Store)) {
me.throwException(me.$className + ": Component requires a configured store, which has to been passed in the class constructor.");
}
if (me.alias.length <= 0) {
me.throwException(me.$className + ": Component requires a configured Ext JS widget alias.");
}
if (me.alias.length === 1 && me.alias[0] === 'widget.shopware-grid-association') {
me.throwException(me.$className + ": Component requires a configured Ext JS widget alias.");
}
},
createToolbar: function() {
var me = this, toolbar;
toolbar = me.callParent(arguments);
toolbar.style = 'background:#fff';
return toolbar;
},
createToolbarItems: function() {
var me = this, items = [];
if (me.getConfig('searchCombo')) {
me.searchStore = me.createAssociationSearchStore(
me.getStore().model,
me.getConfig('associationKey'),
me.getConfig('searchUrl')
);
me.searchComboBox = me.createSearchCombo(me.searchStore);
items.push(me.searchComboBox);
}
return items;
},
createSearchCombo: function (store) {
var me = this;
return Ext.create('Shopware.form.field.Search', {
name: 'associationSearchField',
store: store,
pageSize: 20,
flex: 1,
subApp: me.subApp,
fieldLabel: me.searchComboLabel,
margin: 5,
listeners: {
select: function (combo, records) {
me.onSelectSearchItem(combo, records);
}
}
});
},
onSelectSearchItem: function (combo, records) {
var me = this, inStore;
Ext.each(records, function (record) {
inStore = me.getStore().getById(record.get('id'));
if (inStore === null) {
me.getStore().add(record);
combo.setValue('');
}
});
}
});
Ext.define('Shopware.model.Container', {
extend: 'Ext.container.Container',
autoScroll: true,
associationComponents: [],
eventAlias: undefined,
fieldAssociations: undefined,
record: undefined,
mixins: {
helper: 'Shopware.model.Helper'
},
statics: {
displayConfig: {
controller: undefined,
eventAlias: undefined,
searchUrl: '/stageware12/backend/base/searchAssociation',
fieldSets: [
{
fields: { },
title: undefined
}
],
associations: [  ],
fieldAlias: undefined,
splitFields: true
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
if (config.controller) {
config.searchUrl = config.searchUrl.replace(
'/backend/base/', '/backend/' + config.controller + '/'
);
}
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
val = val || '';
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
constructor: function (opts) {
var me = this;
me._opts = me.statics().getDisplayConfig(opts, this);
me.callParent(arguments);
},
initComponent: function() {
var me = this;
me.checkRequirements();
me.eventAlias = me.getConfig('eventAlias');
if (!me.eventAlias) me.eventAlias = me.getEventAlias(me.record.$className);
me.registerEvents();
me.fireEvent(me.eventAlias + '-before-init-component', me);
me.fieldAssociations = me.getAssociations(me.record.$className, [
{ relation: 'ManyToOne' }
]);
me.associationComponents = [];
me.items = me.createItems();
me.title = me.getModelName(me.record.$className);
me.fireEvent(me.eventAlias + '-after-init-component', me);
me.callParent(arguments);
},
checkRequirements: function() {
var me = this;
if (!(me.record instanceof Shopware.data.Model)) {
me.throwException(me.$className + ": Component requires a passed Shopware.data.Model in the `record property.");
}
},
registerEvents: function() {
var me = this;
this.addEvents(
me.eventAlias + '-before-init-component',
me.eventAlias + '-after-init-component',
me.eventAlias + '-before-create-items',
me.eventAlias + '-after-create-items',
me.eventAlias + '-before-association-component-created',
me.eventAlias + '-after-association-component-created',
me.eventAlias + '-model-fields-created',
me.eventAlias + '-before-model-field-set-created',
me.eventAlias + '-column-containers-created',
me.eventAlias + '-after-model-field-set-created',
me.eventAlias + '-before-create-model-field',
me.eventAlias + '-association-field-created',
me.eventAlias + '-model-field-created',
me.eventAlias + '-before-reload-data',
me.eventAlias + '-before-reload-association-data',
me.eventAlias + '-after-reload-association-data',
me.eventAlias + '-after-reload-data',
me.eventAlias + '-before-load-lazy-loading-component',
me.eventAlias + '-after-load-lazy-loading-component'
);
},
createItems: function() {
var me = this, items = [], item, config,
associations, fields, field, keys;
if (!me.fireEvent(me.eventAlias + '-before-create-items', me, items)) {
return false;
}
Ext.each(me.getConfig('fieldSets'), function(fieldSet) {
if (Ext.isFunction(fieldSet)) {
item = fieldSet.call(this, items, me.record.$className);
if (item) items.push(item);
return true;
}
fields = [];
keys = [];
if (Object.keys(fieldSet.fields).length > 0) {
keys = Object.keys(fieldSet.fields);
} else if (me.getConfig('fieldSets').length <= 1) {
keys = me.record.fields.keys;
}
Ext.each(keys, function(key) {
config = fieldSet.fields[key] || {};
field = me.createModelField(
me.record,
me.getFieldByName(me.record.fields.items, key),
me.getConfig('fieldAlias'),
config
);
if (field) fields.push(field);
});
item = me.createModelFieldSet(me.record.$className, fields, fieldSet);
items.push(item);
});
associations = me.getAssociations(
me.record.$className,
{ associationKey: me.getConfig('associations') }
);
Ext.each(associations, function(association) {
item = me.createAssociationComponent(
me.getComponentTypeOfAssociation(association),
Ext.create(association.associatedName),
me.getAssociationStore(me.record, association),
association,
me.record
);
if(item) {
items.push(item);
me.associationComponents[association.associationKey] = item;
}
});
me.fireEvent(me.eventAlias + '-after-create-items', me, items);
return items;
},
createAssociationComponent: function(type, model, store, association, baseRecord) {
var me = this, component = { };
if (!(model instanceof Shopware.data.Model)) {
me.throwException(model.$className + ' has to be an instance of Shopware.data.Model');
}
if (baseRecord && !(baseRecord instanceof Shopware.data.Model)) {
me.throwException(baseRecord.$className + ' has to be an instance of Shopware.data.Model');
}
var componentType = model.getConfig(type);
if (!me.fireEvent(me.eventAlias + '-before-association-component-created', me, component, type, model, store)) {
return component;
}
component = Ext.create(componentType, {
record: model,
store: store,
flex: 1,
subApp: me.subApp,
association: association,
configure: function() {
var config = { };
if (association) {
config.associationKey = association.associationKey;
}
if (baseRecord && baseRecord.getConfig('controller')) {
config.controller = baseRecord.getConfig('controller');
}
return config;
}
});
component.on('viewready', function() {
if (me.isLazyLoadingComponent(component)) {
if (!(me.fireEvent(me.eventAlias + '-before-load-lazy-loading-component', me, component))) {
return true;
}
component.getStore().load({
callback: function(records, operation) {
me.fireEvent(me.eventAlias + '-after-load-lazy-loading-component', me, component, records, operation);
}
});
}
});
me.fireEvent(me.eventAlias + '-after-association-component-created', me, component, type, model, store);
return component;
},
createModelFieldSet: function (modelName, fields, customConfig) {
var me = this, fieldSet = null,
title = me.getModelName(modelName),
model = Ext.create(modelName), items = [], container;
customConfig = customConfig || {};
if (customConfig.title) title = customConfig.title;
if (!me.fireEvent(me.eventAlias + '-before-model-field-set-created', me, fieldSet, items, model)) {
return fieldSet;
}
var splitFields = me.getConfig('splitFields');
if (customConfig.hasOwnProperty('splitFields')) {
splitFields = customConfig.splitFields;
}
if (splitFields) {
container = Ext.create('Ext.container.Container', {
columnWidth: 0.5,
padding: '0 20 0 0',
layout: 'anchor',
items: fields.slice(0, Math.round(fields.length / 2))
});
items.push(container);
container = Ext.create('Ext.container.Container', {
columnWidth: 0.5,
layout: 'anchor',
items: fields.slice(Math.round(fields.length / 2))
});
items.push(container);
} else {
container = Ext.create('Ext.container.Container', {
columnWidth: 1,
layout: 'anchor',
items: fields
});
items.push(container);
}
me.fireEvent(me.eventAlias + '-column-containers-created', me, fields, items, model);
if (customConfig.hasOwnProperty('title')) {
title = customConfig.title;
}
fieldSet = Ext.create('Ext.form.FieldSet', {
flex: 1,
padding: '10 20',
layout: 'column',
items: items,
title: title
});
fieldSet = Ext.apply(fieldSet, customConfig);
me.fireEvent(me.eventAlias + '-after-model-field-set-created', me, fieldSet, model);
return fieldSet;
},
createModelField: function (model, field, alias, customConfig) {
var me = this, value, formField = {}, fieldModel, fieldComponent, xtype;
if (!me.fireEvent(me.eventAlias + '-before-create-model-field', me, formField, model, field, alias)) {
return formField;
}
if (model.idProperty === field.name) {
return null;
}
formField.xtype = 'displayfield';
formField.anchor = '100%';
formField.margin = '0 3 7 0';
formField.labelWidth = 130;
formField.name = field.name;
if (alias !== undefined && Ext.isString(alias) && alias.length > 0) {
formField.name = alias + '[' + field.name + ']';
}
formField.fieldLabel =  me.getHumanReadableWord(field.name);
var fieldAssociation = me.getFieldAssociation(field.name);
if (fieldAssociation === undefined) {
switch (field.type.type) {
case 'int':
formField = me.applyIntegerFieldConfig(formField);
break;
case 'string':
formField = me.applyStringFieldConfig(formField);
break;
case 'bool':
formField = me.applyBooleanFieldConfig(formField);
break;
case 'date':
formField = me.applyDateFieldConfig(formField);
break;
case 'float':
formField = me.applyFloatFieldConfig(formField);
break;
}
} else {
fieldModel = Ext.create(fieldAssociation.associatedName);
fieldComponent = fieldModel.getConfig('field');
xtype = Ext.ClassManager.getAliasesByName(fieldComponent);
formField.xtype = xtype[0].replace('widget.', '');
formField.subApp = me.subApp;
if (fieldComponent === 'Shopware.form.field.Search') {
formField.store = me.createAssociationSearchStore(
fieldAssociation.associatedName,
fieldAssociation.associationKey,
me.getConfig('searchUrl')
);
if (me.record && (value = me.record.get(formField.name))) {
formField.store.load({
params: { id: value }
});
} else {
formField.store.load();
}
}
me.fireEvent(me.eventAlias + '-association-field-created', model, formField, field, fieldAssociation);
}
if (Ext.isString(customConfig)) customConfig = { fieldLabel: customConfig };
customConfig = customConfig || {};
if (Ext.isObject(customConfig)) {
formField = Ext.apply(formField, customConfig);
} else if (Ext.isFunction(customConfig)) {
formField = customConfig.call(this, model, formField, field, fieldAssociation);
}
me.fireEvent(me.eventAlias + '-model-field-created', model, formField, field, fieldAssociation);
return formField;
},
getFieldAssociation: function(fieldName) {
var me = this, fieldAssociation = undefined;
Ext.each(me.fieldAssociations, function(association) {
if (association.field === fieldName) {
fieldAssociation = association;
return false;
}
});
return fieldAssociation;
},
reloadData: function(store, record) {
var me = this, association, component, associationStore;
if (!me.fireEvent(me.eventAlias + '-before-reload-data', me, store, record)) {
return false;
}
Object.keys(me.associationComponents).forEach(function(key) {
component = me.associationComponents[key];
if (component && typeof component.reloadData === 'function') {
association = me.getAssociations(
record.$className,
[ { associationKey: [ key ] } ]
);
associationStore = me.getAssociationStore(
record,
association[0]
);
if (!me.fireEvent(me.eventAlias + '-before-reload-association-data', me, store, record, component, association, associationStore)) {
return true;
}
component.reloadData(
associationStore,
record
);
me.fireEvent(me.eventAlias + '-after-reload-association-data', me, store, record, component, association, associationStore);
}
});
me.fireEvent(me.eventAlias + '-after-reload-data', me, store, record);
}
});
Ext.define('Shopware.form.field.Search', {
extend: 'Ext.form.field.ComboBox',
alias: 'widget.shopware-form-field-search',
queryMode: 'remote',
valueField: 'id',
displayField: 'name',
minChars: 2,
store: undefined,
statics: {
displayConfig: {
listTemplate: false
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
val = val || '';
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
constructor: function (opts) {
var me = this;
me._opts = me.statics().getDisplayConfig(opts, this);
me.callParent(arguments);
},
initComponent: function() {
var me = this;
if (me.getConfig('listTemplate')) {
me.listConfig = me.createSearchComboListConfig();
}
me.on('change', function(field, newValue) {
if (!newValue) {
me.setValue('');
}
});
me.callParent(arguments);
},
createSearchComboListConfig: function () {
return {
getInnerTpl: [
'' +
'<a class="search-item">' +
'<h4>{name}</h4>' +
'<tpl if="values.description">' +
'<br /><span>{[Ext.util.Format.ellipsis(values.description, 150)]}</span>' +
'</tpl>' +
'</a>' +
''
].join()
}
}
});
Ext.define('Shopware.detail.Controller', {
extend: 'Enlight.app.Controller',
mixins: {
helper: 'Shopware.model.Helper'
},
saveSuccessTitle: 'Erfolgreich',
saveSuccessMessage: 'Eintrag wurde erfolgreich gespeichert',
violationErrorTitle: 'Validierungsfehler',
invalidFormTitle: 'Fehler bei der Formularvalidierung',
invalidFormMessage: 'Das Formular beinhaltet ungültige Daten, bitte prüfe Deine Eingabe.',
statics: {
displayConfig: {
detailWindow: undefined,
eventAlias: undefined
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
constructor: function (opts) {
var me = this;
me._opts = me.statics().getDisplayConfig(opts, this);
me.callParent(arguments);
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
init: function () {
var me = this;
if (me.$className !== 'Shopware.detail.Controller') {
me.checkRequirements();
}
if (me.getConfig('eventAlias') && me.getConfig('detailWindow')) {
me.registerEvents();
me.control(me.createControls());
}
me.callParent(arguments);
},
checkRequirements: function() {
var me = this;
if (!me.getConfig('eventAlias')) {
me.throwException(me.$className + ": Component requires the `eventAlias` property in the configure() function");
}
if (!me.getConfig('detailWindow')) {
me.throwException(me.$className + ": Component requires the `detailWindow` property in the configure() function");
}
},
reloadControls: function() {
var me = this;
me.checkRequirements();
me.registerEvents();
me.control(me.createControls());
},
registerEvents: function() {
var me = this;
me.addEvents(
me.getEventName('start-save-record'),
me.getEventName('update-record-on-save'),
me.getEventName('after-update-record-on-save'),
me.getEventName('save-exception'),
me.getEventName('before-send-save-request'),
me.getEventName('save-successfully')
);
},
createControls: function () {
var me = this, alias, controls = {};
alias = Ext.ClassManager.getAliasesByName(me.getConfig('detailWindow'));
if (!alias || alias.length <= 0) {
return false;
}
alias = alias[0];
alias = alias.replace('widget.', '');
controls[alias] = me.createDetailWindowControls();
return controls;
},
createDetailWindowControls: function() {
var me = this, events = {};
events[me.getEventName('save')] = me.onSave;
return events;
},
onSave: function(window, record) {
var me = this, proxy = record.getProxy(), data, form = window.formPanel;
if (!form.getForm().isValid()) {
Shopware.Notification.createGrowlMessage(
me.invalidFormTitle,
me.invalidFormMessage
);
return false;
}
if (!Shopware.app.Application.fireEvent(me.getEventName('start-save-record'), me, window, record, form)) {
return false;
}
if (Shopware.app.Application.fireEvent(me.getEventName('update-record-on-save'), me, window, record, form)) {
form.getForm().updateRecord(record);
}
Shopware.app.Application.fireEvent(me.getEventName('after-update-record-on-save'), me, window, record, form);
proxy.on('exception', function (proxy, response) {
window.setLoading(false);
data = Ext.decode(response.responseText);
Shopware.app.Application.fireEvent(me.getEventName('save-exception'), me, data, window, record, form);
if (data.error) {
Shopware.Notification.createGrowlMessage('', data.error);
}
if (data.violations && data.violations.length > 0) {
me.createViolationMessage(data.violations);
me.markFieldsAsInvalid(window, data.violations);
}
}, me, { single: true });
if (!me.hasModelAction(record, 'update') || !me.hasModelAction(record, 'create')) {
window.destroy();
return;
}
window.setLoading(true);
if (!Shopware.app.Application.fireEvent(me.getEventName('before-send-save-request'), me, window, record, form)) {
return false;
}
record.save({
success: function(result, operation) {
window.setLoading(false);
if (window instanceof Shopware.window.Detail) {
window.loadRecord(result);
}
Shopware.app.Application.fireEvent(me.getEventName('save-successfully'), me, result, window, record, form, operation);
Shopware.Notification.createGrowlMessage(
me.saveSuccessTitle,
me.saveSuccessMessage
);
}
});
},
createViolationMessage: function(violations) {
var me = this,
template = '';
Ext.each(violations, function(violation) {
template += '<li style="line-height: 13px; padding: 3px 0"><b>' + violation.property + '</b>: ' + violation.message + '</li>';
});
template = '<ul>' + template + '</ul>';
Shopware.Notification.createStickyGrowlMessage({
title: me.violationErrorTitle,
text: template,
width: 400
});
},
markFieldsAsInvalid: function(window, violations) {
var me = this;
Ext.each(violations, function(violation) {
var field = me.getFieldByName(window.formPanel.getForm().getFields().items, violation.property);
if (field) {
field.focus();
field.markInvalid(violation.message);
}
});
},
getEventName: function (name) {
return this.getConfig('eventAlias') + '-' + name;
}
});
Ext.define('Shopware.listing.InfoPanel', {
extend: 'Ext.panel.Panel',
alias: 'widget.shopware-listing-info-panel',
mixins: {
helper: 'Shopware.model.Helper'
},
region: 'east',
width: 200,
cls: 'detail-view',
collapsible: true,
layout: 'fit',
infoView: undefined,
listingWindow: undefined,
gridPanel: undefined,
title: 'Detail Informationen',
emptyText: 'Kein Eintrag selektiert',
statics: {
displayConfig: {
model: undefined,
fields: { }
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
constructor: function (opts) {
var me = this;
me._opts = me.statics().getDisplayConfig(opts, this);
me.callParent(arguments);
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
initComponent: function() {
var me = this;
me.checkRequirements();
me.gridPanel = me.listingWindow.gridPanel;
me.items = me.createItems();
me.addEventListeners();
me.callParent(arguments);
},
checkRequirements: function() {
var me = this;
if (!(me.listingWindow instanceof Ext.window.Window)) {
me.throwException(me.$className + ": Component requires a passed listingWindow property which contains the instance of the assigned Shopware.window.Listing");
}
if (!(me.listingWindow.gridPanel instanceof Shopware.grid.Panel)) {
me.throwException(me.$className + ": The listingWindow.gridPanel property contains no Shopware.grid.Panel instance.");
}
if (me.alias.length <= 0) {
me.throwException(me.$className + ": Component requires a configured Ext JS widget alias.");
}
if (me.alias.length === 1 && me.alias[0] === 'widget.shopware-listing-info-panel') {
me.throwException(me.$className + ": Component requires a configured Ext JS widget alias.");
}
},
addEventListeners: function() {
var me = this;
me.gridPanel.on(me.gridPanel.eventAlias + '-selection-changed', function(grid, selModel, records) {
var record = { };
if (records.length > 0) {
record = records.shift();
}
me.updateInfoView(record);
});
},
createItems: function() {
var me = this, items = [];
items.push(me.createInfoView());
return items;
},
createInfoView: function(){
var me = this;
me.infoView = Ext.create('Ext.view.View', {
tpl: me.createTemplate(),
flex: 1,
autoScroll: true,
padding: 5,
style: 'color: #6c818f;font-size:11px',
emptyText: '<div style="font-size:13px; text-align: center;">' + me.emptyText + '</div>',
deferEmptyText: false,
itemSelector: 'div.item',
renderData: []
});
return me.infoView;
},
createTemplate: function() {
var me = this, fields = [], model, keys, field, config,
configFields = me.getConfig('fields');
if (me.getConfig('model')) {
model = Ext.create(me.getConfig('model'));
keys = model.fields.keys;
if (Object.keys(configFields).length > 0) keys = Object.keys(configFields);
Ext.each(keys, function(key) {
field = me.getFieldByName(model.fields.items, key);
config = configFields[key];
if (Ext.isFunction(config)) {
field = config.call(me, me, field);
if (field) fields.push(field);
} else if (Ext.isObject(config) || (Ext.isString(config) && config.length > 0)) {
fields.push(config);
} else {
fields.push(me.createTemplateForField(model, field));
}
});
}
return new Ext.XTemplate(
'<tpl for=".">',
'<div class="item" style="">',
fields.join(''),
'</div>',
'</tpl>'
);
},
createTemplateForField: function(model, field) {
var me = this;
return '<p style="padding: 2px"><b>' + me.getHumanReadableWord(field.name) +':</b> {' + field.name + '}</p>'
},
updateInfoView: function(record) {
var me = this;
if (record.data) {
me.infoView.update(record.data);
} else {
me.infoView.update(me.infoView.emptyText);
}
return true;
}
});
Ext.define('Shopware.listing.FilterPanel', {
extend: 'Ext.form.Panel',
alias: 'widget.shopware-listing-filter-panel',
mixins: {
helper: 'Shopware.model.Helper',
container: 'Shopware.model.Container'
},
region: 'west',
width: 300,
cls: 'detail-view',
collapsible: true,
layout: 'anchor',
title: 'Filter',
listingWindow: undefined,
gridPanel: undefined,
infoText: undefined,
toolbar: undefined,
filterButton: undefined,
resetButton: undefined,
fieldAssociations: [ ],
infoTextSnippet: 'Aktiviere die gewünschten Filter über die jeweilige Checkbox. Aktivierte Filter werden mit einer UND-Bedingung verknüpft.',
filterButtonText: 'Filter anwenden',
resetButtonText: 'Filter zurücksetzen',
filterFieldStyle: 'background: #fff',
statics: {
displayConfig: {
eventAlias: undefined,
controller: undefined,
searchUrl: '/stageware12/backend/base/searchAssociation',
model: undefined,
fields: { }
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
if (config.controller) {
config.searchUrl = config.searchUrl.replace(
'/backend/base/', '/backend/' + config.controller + '/'
);
}
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
constructor: function (opts) {
var me = this;
me._opts = me.statics().getDisplayConfig(opts, this);
me.callParent(arguments);
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
initComponent: function() {
var me = this;
me.checkRequirements();
me.eventAlias = me.getConfig('eventAlias');
if (!me.eventAlias) me.eventAlias = me.getEventAlias(me.getConfig('model'));
me.registerEvents();
if (!me.gridPanel) {
me.gridPanel = me.listingWindow.gridPanel;
}
me.items = me.createItems();
me.dockedItems = me.createDockedItems();
me.callParent(arguments);
},
getStore: function() {
return this.gridPanel.getStore();
},
checkRequirements: function() {
var me = this;
if (!me.getConfig('controller')) {
me.throwException(me.$className + ": Component requires the `controller` property in the configure() function");
}
if (!me.getConfig('model')) {
me.throwException(me.$className + ": Component requires the `model` property in the configure() function");
}
if (me.alias.length <= 0) {
me.throwException(me.$className + ": Component requires a configured Ext JS widget alias.");
}
if (me.alias.length === 1 && me.alias[0] === 'widget.shopware-listing-filter-panel') {
me.throwException(me.$className + ": Component requires a configured Ext JS widget alias.");
}
},
registerEvents: function() {
this.addEvents(
this.eventAlias + '-before-apply-field-filter',
this.eventAlias + '-before-grid-load-filter',
this.eventAlias + '-before-filter-grid',
this.eventAlias + '-after-filter-grid'
);
},
createItems: function() {
var me = this, items = [];
items.push(me.createInfoText());
items.push(me.createFilterFields());
return items;
},
createInfoText: function() {
var me = this;
me.infoText = Ext.create('Ext.container.Container', {
html: me.infoTextSnippet,
style: 'color: #6c818f; font-size: 11px; line-height: 14px;',
margin: '0 0 10'
});
return me.infoText;
},
createFilterFields: function() {
var me = this, fields = { }, items = [], field, config,
record = Ext.create(me.getConfig('model'));
me.fieldAssociations = me.getAssociations(me.getConfig('model'), [
{ relation: 'ManyToOne' }
]);
var configFields = me.getConfig('fields');
Ext.each(record.fields.items, function(modelField) {
if (Object.keys(configFields).length > 0 && !(configFields.hasOwnProperty(modelField.name))) {
return true;
}
config = configFields[modelField.name];
if (Ext.isString(config)) config = { fieldLabel: config };
field = me.createModelField(record, modelField, undefined, config);
if (!field) return true;
var container = Ext.create('Shopware.filter.Field', {
field: field,
style: me.filterFieldStyle,
subApp: me.subApp
});
field.container = container;
fields[modelField.name] = container;
});
var sorting = record.fields.keys;
if (configFields && Object.keys(configFields).length > 0) {
sorting = Object.keys(configFields);
}
Ext.each(sorting, function(key) {
if (fields[key]) {
items.push(fields[key]);
}
});
return Ext.create('Ext.container.Container', {
items: items,
layout: 'anchor',
anchor: '100%',
defaults: {
anchor: '100%'
}
});
},
createDockedItems: function() {
var me = this;
return [
me.createToolbar()
];
},
createToolbar: function() {
var me = this;
me.toolbar =  Ext.create('Ext.toolbar.Toolbar', {
items: [ me.createFilterButton(), me.createResetButton() ],
dock: 'bottom',
margin: '1 0'
});
return me.toolbar;
},
createFilterButton: function() {
var me = this;
me.filterButton = Ext.create('Ext.button.Button', {
cls: 'secondary small',
iconCls: 'sprite-funnel',
text: me.filterButtonText,
handler: function() {
me.filterGridStore();
}
});
return me.filterButton;
},
createResetButton: function() {
var me = this;
me.resetButton = Ext.create('Ext.button.Button', {
cls: 'secondary small',
iconCls: 'sprite-funnel--minus',
text: me.resetButtonText,
handler: function() {
me.getForm().reset();
me.getStore().clearFilter(true);
me.getStore().load();
}
});
return me.resetButton;
},
filterGridStore: function() {
var me = this;
if (!me.fireEvent(me.eventAlias + '-before-filter-grid', me, me.gridPanel)) {
return false;
}
me.getStore().clearFilter(true);
me.createFilters();
me.fireEvent(me.eventAlias + '-before-grid-load-filter', me, me.gridPanel);
me.getStore().load({
callback: function(records, operation) {
me.fireEvent(me.eventAlias + '-after-filter-grid', me, me.gridPanel, records, operation);
}
});
},
createFilters: function() {
var me = this, expression, field,
model = Ext.create(me.getConfig('model')),
values = me.getForm().getValues();
Object.keys(values).forEach(function (key) {
if (me.getFieldByName(model.fields.items, key) === undefined) {
return true;
}
if (!me.fireEvent(me.eventAlias + '-before-apply-field-filter', me, me.gridPanel, key, values[key])) {
return true;
}
expression = '=';
field = me.getForm().findField(key);
if (field && field.expression) {
expression = field.expression;
}
me.getStore().filters.add(key,
Ext.create('Ext.util.Filter', {
property: key,
expression: expression,
value: values[key]
})
);
});
}
});
Ext.define('Shopware.filter.Field', {
extend: 'Ext.form.FieldContainer',
padding: 10,
layout: {
type: 'hbox',
align: 'stretch'
},
style: 'background: #fff',
mixins: {
helper: 'Shopware.model.Helper'
},
checkbox: undefined,
field: undefined,
statics: {
displayConfig: {
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
constructor: function (opts) {
var me = this;
me._opts = me.statics().getDisplayConfig(opts, this);
me.callParent(arguments);
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
initComponent: function() {
var me = this;
me.checkbox = Ext.create('Ext.form.field.Checkbox', {
width: 28,
margin: '2 0 0 0'
});
me.checkbox.on('change', function(checkbox, value) {
var field = me.items.items[1];
if (!field) return false;
if (value) {
field.enable();
} else {
field.disable()
}
});
me.field.flex = 1;
me.field.labelWidth = 100;
me.field.disabled = true;
me.field.margin = 0;
me.items = [
me.checkbox,
me.field
];
me.callParent(arguments);
}
});
Ext.define('Shopware.store.Association', {
extend: 'Ext.data.Store',
mixins: {
helper: 'Shopware.model.Helper'
},
autoLoad: false,
batch: true,
remoteSort: true,
remoteFilter: true,
pageSize: 20,
statics: {
displayConfig: {
controller: undefined,
searchUrl: '/stageware12/backend/base/reloadAssociation'
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
if (config.controller) {
config.searchUrl = config.searchUrl.replace(
'/backend/base/', '/backend/' + config.controller + '/'
);
}
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
constructor: function (config) {
var me = this;
me.association = config.association;
me.extraParams = config.extraParams;
me._opts = me.statics().getDisplayConfig(config, this);
return me.callParent(config);
},
load: function(options) {
var me = this,
operation,
proxy;
me.checkRequirements();
proxy = Ext.create('Ext.data.proxy.Ajax', {
url: me.getConfig('searchUrl'),
extraParams: me.extraParams,
reader: Ext.create('Shopware.data.reader.Application', {
root: 'data',
totalProperty: 'total',
model: me.model
})
});
options = Ext.apply({
action: 'read',
filters: me.filters.items,
sorters: me.getSorters()
}, options);
options.page = options.page || me.currentPage;
options.start = (options.start !== undefined) ? options.start : (options.page - 1) * me.pageSize;
options.limit = options.limit || me.pageSize;
me.lastOptions = options;
operation = new Ext.data.Operation(options);
if (me.fireEvent('beforeload', me, operation) !== false) {
me.loading = true;
proxy.read(operation, me.onProxyLoad, me);
}
return me;
},
checkRequirements: function() {
var me = this;
if (!me.getConfig('controller')) {
me.throwException(me.$className + ": Reload not available. Please configure the store `controller` property.");
}
}
});
Ext.define('Shopware.form.field.Media', {
extend: 'Ext.form.FieldContainer',
alias: 'widget.shopware-media-field',
mixins: [
'Shopware.model.Helper',
'Ext.form.field.Base'
],
mediaPath: '',
noMedia: '/stageware12/themes/Backend/ExtJs/backend/_resources/images/index/no-picture.jpg',
value: undefined,
path: undefined,
mediaId: undefined,
valueField: 'id',
minimizable: true,
selectButton: undefined,
resetButton: undefined,
preview: undefined,
albumId: undefined,
validTypes: [ ],
record: undefined,
buttonContainer: undefined,
previewContainer: undefined,
selectButtonText: 'Medium selektieren',
resetButtonText: 'Medium zurücksetzen',
removeBackground: false,
statics: {
displayConfig: {
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
constructor: function (opts) {
var me = this;
me._opts = me.statics().getDisplayConfig(opts, this);
me.callParent(arguments);
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
initComponent: function() {
var me = this;
me.items = me.createItems();
me.callParent(arguments);
if (me.value) {
me.requestMediaData(me.value);
}
},
afterRender: function() {
var me = this;
me.callParent(arguments);
if (me.helpText) {
me.createHelp();
}
if (me.supportText) {
me.createSupport()
}
},
createItems: function() {
var me = this,
mainContainer = Ext.create('Ext.container.Container', {
layout: {
type: 'hbox',
align: 'stretch'
},
items: [
me.createButtonContainer(),
me.createPreviewContainer()
]
});
return [
mainContainer
]
},
createButtonContainer: function() {
var me = this;
me.buttonContainer = Ext.create('Ext.container.Container', {
width: 180,
padding: '0 10',
style: me.removeBackground ? '' : 'background: #fff',
layout: {
type: 'vbox',
align: 'stretch'
},
items: [
me.createSelectButton(),
me.createResetButton()
]
});
return me.buttonContainer;
},
createPreviewContainer: function() {
var me = this;
me.previewContainer = Ext.create('Ext.container.Container', {
flex: 1,
style: me.removeBackground ? '' : 'background: #fff',
items: [ me.createPreview() ]
});
return me.previewContainer;
},
createSelectButton: function() {
var me = this;
me.selectButton = Ext.create('Ext.button.Button', {
text: me.selectButtonText,
iconCls: 'sprite-inbox-select',
cls: 'secondary small',
margin: '10 0',
handler: function() {
me.openMediaManager()
}
});
return me.selectButton;
},
createResetButton: function() {
var me = this;
me.resetButton = Ext.create('Ext.button.Button', {
text: me.resetButtonText,
iconCls: 'sprite-inbox--minus',
cls: 'secondary small',
handler: function() {
me.removeMedia();
}
});
return me.resetButton;
},
removeMedia: function() {
var me = this;
me.value = null;
me.path = null;
me.mediaId = null;
me.preview.setSrc(me.noMedia);
},
createPreview: function() {
var me = this, value;
if (me.value == undefined) {
value = me.noMedia;
} else {
value = me.mediaPath + me.value;
}
me.preview = Ext.create('Ext.Img', {
src: value,
height: 100,
maxHeight: 100,
padding: 5,
margin: 5,
style: "border-radius: 6px; border: 1px solid #c4c4c4;"
});
return me.preview;
},
openMediaManager: function() {
var me = this;
if (!(me.fireEvent('before-open-media-manager', me))) {
return false;
}
Shopware.app.Application.addSubApplication({
name: 'Shopware.apps.MediaManager',
layout: 'small',
eventScope: me,
params: {
albumId: me.albumId
},
mediaSelectionCallback: me.onSelectMedia,
selectionMode: false,
validTypes: me.validTypes || [],
minimizable: me.minimizable
});
me.fireEvent('after-open-media-manager', me);
},
onSelectMedia: function(button, window, selection) {
var me = this,
record = selection[0];
if (!(record instanceof Ext.data.Model)) {
return true;
}
me.record = record;
me.path = record.get('path');
me.mediaId = record.get('id');
me.value = record.get(me.valueField);
me.updatePreview(me.path);
window.close();
},
updatePreview: function(image) {
var me = this, src;
if (Ext.isEmpty(image)) {
src = me.noMedia;
} else {
src = me.mediaPath + image;
}
me.preview.setSrc(src);
},
getValue: function() {
return this.value;
},
setValue: function(value) {
var me = this;
if (value !== me.value) {
me.requestMediaData(value);
}
this.value = value;
},
getSubmitData: function() {
var value = {};
value[this.name] = this.value;
return value;
},
requestMediaData: function(value) {
var me = this, params = {};
if (!value) {
me.updatePreview(null);
return;
}
params[me.valueField] = value;
Ext.Ajax.request({
url: '/stageware12/backend/mediaManager/getMedia',
method: 'POST',
params: params,
success: function(response) {
var operation = Ext.decode(response.responseText);
if (operation.success == true) {
me.record = Ext.create('Shopware.apps.Base.model.Media', operation.data);
me.mediaId = me.record.get('id');
me.path = me.record.get('path');
me.updatePreview(me.path);
}
}
});
},
insertGlobeIcon: function (globe) {
var me = this;
globe.setStyle({
position: 'absolute',
top: '14px',
left: '14px',
right: 'auto'
});
if (Ext.isDefined(me.previewContainer.getEl())) {
me.previewContainer.getEl().appendChild(globe);
}
},
isValid: function() {
if (this.allowBlank || this.disabled || !Ext.isDefined(this.allowBlank)) {
return true;
}
return typeof this.value === 'number' && this.value !== 0;
}
});
Ext.define('Shopware.store.Search', {
extend: 'Ext.data.Store',
mixins: { helper: 'Shopware.model.Helper' },
autoLoad: false,
batch: true,
remoteSort: true,
remoteFilter: true,
pageSize: 20,
statics: {
displayConfig: {
entity: undefined,
proxy: {
type: 'ajax',
api: {
read: '/stageware12/backend/search/search'
},
reader: {
type: 'application',
root: 'data',
totalProperty: 'total'
}
}
},
getDisplayConfig: function (userOpts, definition) {
var config = { };
if (userOpts && typeof userOpts.configure == 'function') {
config = Ext.apply({ }, config, userOpts.configure());
}
if (definition && typeof definition.configure === 'function') {
config = Ext.apply({ }, config, definition.configure());
}
config = Ext.apply({ }, config, this.displayConfig);
return config;
},
setDisplayConfig: function (prop, val) {
var me = this;
if (!me.displayConfig.hasOwnProperty(prop)) {
return false;
}
me.displayConfig[prop] = val;
return true;
}
},
configure: function() {
return { };
},
getConfig: function (prop) {
var me = this;
return me._opts[prop];
},
constructor: function (config) {
var me = this;
me._opts = me.statics().getDisplayConfig(config, this);
me.convertProxyApi();
me.callParent(arguments);
},
convertProxyApi: function () {
var me = this;
me.checkRequirements();
var proxy = me.getConfig('proxy');
proxy.extraParams = {
entity: me.getConfig('entity')
};
me.setProxy(proxy);
},
checkRequirements: function() {
var me = this;
if (!me.getConfig('entity')) {
me.throwException(me.$className + ": Component requires the `entity` property in the configure() function.");
}
}
});
Ext.define('Shopware.apps.Base.model.User', {
alternateClassName: 'Shopware.model.User',
extend: 'Shopware.data.Model',
idProperty: 'id',
fields: [
{ name: 'id', type: 'int' },
{ name: 'roleId', type: 'int' },
{ name: 'username', type: 'string' },
{ name: 'password', type: 'string' },
{ name: 'localeId', type: 'int' },
{ name: 'sessionId', type: 'string' },
{ name: 'lastLogin', type: 'date' },
{ name: 'name', type: 'string' },
{ name: 'email', type: 'string' },
{ name: 'active', type: 'int' },
{ name: 'failedLogins', type: 'int' },
{ name: 'lockedUntil', type: 'date' }
]
});
Ext.define('Shopware.apps.Base.model.Category', {
alternateClassName: 'Shopware.model.Category',
extend: 'Shopware.data.Model',
idProperty: 'id',
fields: [
{ name: 'id', type: 'int' },
{ name: 'parent', type: 'int' },
{ name: 'name', type: 'string' },
{ name: 'position', type: 'int' },
{ name: 'active', type: 'boolean', defaultValue: true },
{ name: 'childrenCount', type: 'int' },
{ name: 'text', type: 'string' },
{ name: 'cls', type: 'string' },
{ name: 'leaf', type: 'boolean' },
{ name: 'allowDrag', type: 'boolean' },
{ name: 'facetIds', type: 'string' }
]
});
Ext.define('Shopware.apps.Base.model.CustomerGroup', {
alternateClassName: 'Shopware.model.CustomerGroup',
extend: 'Shopware.data.Model',
idProperty: 'id',
fields: [
{ name: 'id', type: 'int' },
{ name: 'key', type: 'string' },
{ name: 'name', type: 'string' },
{ name: 'tax', type: 'boolean', defaultValue: true },
{ name: 'taxInput', type: 'boolean', defaultValue: true },
{ name: 'mode', type: 'boolean' },
{ name: 'discount', type: 'float', useNull: true }
]
});
Ext.define('Shopware.apps.Base.model.Dispatch', {
alternateClassName: 'Shopware.model.Dispatch',
extend: 'Shopware.data.Model',
idProperty: 'id',
fields: [
{ name: 'id', type: 'int' },
{ name: 'name', type: 'string' },
{ name: 'type', type: 'int' },
{ name: 'comment', type: 'string' },
{ name: 'active', type: 'int' },
{ name: 'position', type: 'int' }
]
});
Ext.define('Shopware.apps.Base.model.Payment', {
alternateClassName: 'Shopware.model.Payment',
extend: 'Shopware.data.Model',
idProperty: 'id',
fields: [
{ name: 'id', type: 'int' },
{ name: 'name', type: 'string' },
{ name: 'description', type: 'string' },
{ name: 'position', type: 'int' },
{ name: 'active', type: 'boolean' }
]
});
Ext.define('Shopware.apps.Base.model.Shop', {
alternateClassName: 'Shopware.model.Shop',
extend: 'Shopware.data.Model',
fields: [
{ name: 'id', type: 'int' },
{ name: 'default', type: 'boolean' },
{ name: 'localeId', type: 'int' },
{ name: 'categoryId', type: 'int' },
{ name: 'name', type: 'string' }
]
});
Ext.define('Shopware.apps.Base.model.Supplier', {
alternateClassName: 'Shopware.model.Supplier',
extend: 'Shopware.data.Model',
idProperty: 'id',
fields: [
{ name: 'id', type: 'int' },
{ name: 'name', type: 'string' },
{ name: 'image', type: 'string' },
{ name: 'link', type: 'string' },
{ name: 'description', type: 'string' }
]
});
Ext.define('Shopware.apps.Base.model.Country', {
alternateClassName: 'Shopware.model.Country',
extend: 'Shopware.data.Model',
idProperty: 'id',
fields: [
{ name: 'id', type: 'int' },
{ name: 'name', type: 'string' },
{ name: 'iso', type: 'string' },
{ name: 'isoName', type: 'string' },
{ name: 'position', type: 'int' },
{ name: 'active', type: 'boolean' },
{ name: 'forceStateInRegistration', type: 'boolean' },
{ name: 'displayStateInRegistration', type: 'boolean' },
{ name: 'allowShipping', type: 'boolean' }
]
});
Ext.define('Shopware.apps.Base.model.Article', {
alternateClassName: 'Shopware.model.Article',
extend: 'Shopware.data.Model',
idProperty: 'id',
fields: [
{ name: 'id', type: 'int' },
{ name: 'number', type: 'string' },
{ name: 'name', type: 'string' },
{ name: 'description', type: 'string' },
{ name: 'supplierName', type: 'string' },
{ name: 'supplierId', type: 'int' },
{ name: 'active', type: 'int' },
{ name: 'detailId', type: 'int' },
{ name: 'changeTime', type: 'date' },
{ name: 'inStock', type: 'int' },
{ name: 'label', type: 'string' }
]
});
Ext.define('Shopware.apps.Base.model.Variant', {
extend: 'Shopware.data.Model',
fields: [
{ name: 'id', type: 'int' },
{ name: 'name', type: 'string' },
{ name: 'articleId', type: 'int' },
{ name: 'additionalText', type: 'string' },
{ name: 'supplierName', type: 'string' },
{ name: 'supplierId', type: 'int' },
{ name: 'ordernumber', type: 'string' },
{ name: 'inStock', type: 'string' },
{ name: 'active', type: 'int' },
{ name: 'number', type: 'string', mapping: 'ordernumber' },
]
});
Ext.define('Shopware.apps.Base.model.Locale', {
alternateClassName: ['Shopware.model.Locales', 'Shopware.model.Locale'],
extend: 'Shopware.data.Model',
idProperty: 'id',
fields: [
{ name: 'id', type: 'int' },
{ name: 'name', type: 'string', convert: function(v, record) {
return record.data.language + ' (' + record.data.territory + ')';
} },
{ name: 'language', type: 'string' },
{ name: 'territory', type: 'string' },
{ name: 'locale', type: 'string' }
]
});
Ext.define('Shopware.apps.Base.model.Currency', {
alternateClassName: 'Shopware.model.Currency',
extend: 'Shopware.data.Model',
idProperty: 'id',
fields: [
{ name: 'id', type: 'int' },
{ name: 'name', type: 'string' },
{ name: 'currency', type: 'string' }
]
});
Ext.define('Shopware.apps.Base.model.PaymentStatus', {
alternateClassName: 'Shopware.model.PaymentStatus',
extend: 'Shopware.data.Model',
idProperty: 'id',
fields: [
{ name: 'id', type: 'int' },
{ name: 'name', type: 'string' },
{
name: 'description',
type: 'string',
convert: function(value, record) {
if (value) {
return value;
} else {
return record.get('name');
}
}
}
]
});
Ext.define('Shopware.apps.Base.model.OrderStatus', {
alternateClassName: 'Shopware.model.OrderStatus',
extend: 'Shopware.data.Model',
idProperty: 'id',
fields: [
{ name: 'id', type: 'int' },
{ name: 'name', type: 'string' },
{
name: 'description',
type: 'string',
convert: function(value, record) {
if (value) {
return value;
} else {
return record.get('name');
}
}
}
]
});
Ext.define('Shopware.apps.Base.model.Address', {
alternateClassName: 'Shopware.model.Address',
extend: 'Shopware.data.Model',
fields: [
{ name: 'salutation', type: 'string' },
{ name: 'company', type: 'string' },
{ name: 'department', type: 'string' },
{ name: 'firstName', type: 'string' },
{ name: 'title', type: 'string' },
{ name: 'lastName', type: 'string' },
{ name: 'street', type: 'string' },
{ name: 'zipCode', type: 'string' },
{ name: 'city', type: 'string' },
{ name: 'additionalAddressLine1', type: 'string' },
{ name: 'additionalAddressLine2', type: 'string' },
{ name: 'salutationSnippet', type: 'string' },
{ name: 'countryId', type: 'int', useNull: true }
]
});
Ext.define('Shopware.apps.Base.model.BillingAddress', {
alternateClassName: 'Shopware.model.BillingAddress',
extend: 'Shopware.apps.Base.model.Address',
fields: [
{ name: 'number', type: 'string' },
{ name: 'phone', type: 'string' },
{ name: 'vatId', type: 'string' }
]
});
Ext.define('Shopware.apps.Base.model.Customer', {
alternateClassName: 'Shopware.model.Customer',
extend: 'Shopware.data.Model',
fields: [
{ name: 'id', type: 'int' },
{ name: 'groupKey', type: 'string' },
{ name: 'email', type: 'string' },
{ name: 'active', type: 'boolean' },
{ name: 'accountMode', type: 'int' },
{ name: 'confirmationKey', type: 'string' },
{ name: 'paymentId', type: 'int', useNull: true },
{ name: 'firstLogin', type: 'date' },
{ name: 'lastLogin', type: 'date' },
{ name: 'newsletter', type: 'int' },
{ name: 'validation', type: 'int' },
{ name: 'languageId', type: 'int' },
{ name: 'shopId', type: 'int', useNull: true },
{ name: 'priceGroupId', type: 'int' },
{ name: 'internalComment', type: 'string' },
{ name: 'failedLogins', type: 'int' },
{ name: 'referer', type: 'string' },
{ name: 'firstname', type: 'string' },
{ name: 'lastname', type: 'string' },
{ name: 'birthday', type: 'date', useNull: true },
{ name: 'customernumber', type: 'int' },
{ name: 'default_billing_address_id', type: 'int', useNull: true },
{ name: 'default_shipping_address_id', type: 'int', useNull: true }
]
});
Ext.define('Shopware.apps.Base.model.Tax', {
alternateClassName: 'Shopware.model.Tax',
extend: 'Shopware.data.Model',
idProperty: 'id',
fields: [
{ name: 'id',  type: 'integer' },
{ name: 'tax',type: 'float' },
{ name: 'name',type: 'string' }
]
});
Ext.define('Shopware.apps.Base.model.Media', {
extend: 'Shopware.data.Model',
configure: function() {
return {
field: 'Shopware.form.field.Media'
};
},
fields: [
'created',
'description',
'extension',
'id',
'name',
'type',
'path',
'userId',
'width',
'height',
'albumId',
'thumbnail'
]
});
Ext.define('Shopware.apps.Base.model.Template', {
alternateClassName: 'Shopware.model.Template',
extend: 'Ext.data.Model',
idProperty: 'id',
fields: [
{ name: 'id', type: 'int' },
{ name: 'name', type: 'string' },
{ name: 'template', type: 'string' }
]
});
Ext.define('Shopware.apps.Base.model.CountryArea', {
extend: 'Shopware.data.Model',
fields: [
{ name: 'id', type: 'int' },
{ name: 'name', type: 'string', convert: function(v) {
return v.charAt(0).toUpperCase() + v.substr(1);
} },
{ name: 'active', type: 'boolean' }
]
});
Ext.define('Shopware.apps.Base.model.CountryState', {
extend: 'Shopware.data.Model',
fields: [
{ name: 'id', type: 'int' },
{ name: 'countryId', type: 'int' },
{ name: 'name', type: 'string' },
{ name: 'shortCode', type: 'string' },
{ name: 'position', type: 'int' },
{ name: 'active', type: 'boolean' }
]
});
Ext.define('Shopware.apps.Base.model.Form', {
extend: 'Ext.data.Model',
alternateClassName: 'Shopware.model.Form',
fields: [
{ name: 'id', type: 'int', useNull: true },
{ name: 'label', type: 'string' },
{ name: 'name', type: 'string' },
{ name: 'description', type: 'string' }
],
associations: [{
type: 'hasMany', model: 'Shopware.apps.Base.model.Element',
name: 'getElements', associationKey: 'elements'
}]
});
Ext.define('Shopware.apps.Base.model.Element', {
extend: 'Ext.data.Model',
alternateClassName: 'Shopware.model.Element',
fields: [
{ name: 'id', type: 'int', useNull: true },
{ name: 'name', type: 'string' },
{ name: 'value' },
{ name: 'label', type: 'string' },
{ name: 'description', type: 'string', useNull: true },
{ name: 'type', type: 'string', useNull: true },
{ name: 'required', type: 'boolean' },
{ name: 'scope', type: 'int' },
'options'
],
associations: [{
type: 'hasMany',
model: 'Shopware.apps.Base.model.Value',
name: 'getValues',
associationKey: 'values'
}]
});
Ext.define('Shopware.apps.Base.model.Value', {
extend: 'Ext.data.Model',
alternateClassName: 'Shopware.model.Value',
fields: [
{ name: 'id', type: 'int', useNull: true },
{ name: 'shopId', type: 'int' },
{ name: 'value', defaultValue: null, useNull: true }
]
});
Ext.define('Shopware.apps.Base.model.PositionStatus', {
snippets: {
state0: 'Offen',
state1: 'In Bearbeitung (Wartet)',
state2: 'Abgebrochen',
state3: 'Komplett abgeschlossen'
},
alternateClassName: 'Shopware.model.PositionStatus',
extend: 'Shopware.data.Model',
fields: [
{ name: 'id', type: 'int' },
{
name: 'description',
type: 'string',
convert: function(value, record) {
var snippet = value;
if (record && record.snippets) {
snippet = record.snippets['state' + record.get('id')];
}
if (Ext.isString(snippet) && snippet.length > 0) {
return snippet;
} else {
return value;
}
}
}
]
});
Ext.define('Shopware.apps.Base.model.DocType', {
extend: 'Ext.data.Model',
fields: [
{ name: 'id', type: 'int' },
{ name: 'key', type: 'string' },
{ name: 'name', type: 'string' },
{ name: 'template', type: 'string' },
{ name: 'numbers', type: 'string' },
{ name: 'left', type: 'int' },
{ name: 'right', type: 'int' },
{ name: 'top', type: 'int' },
{ name: 'bottom', type: 'int' },
{ name: 'pageBreak', type: 'int' }
]
});
Ext.define('Shopware.apps.Base.model.PasswordEncoder', {
alternateClassName: 'Shopware.model.PasswordEncoder',
extend: 'Ext.data.Model',
fields: [
{ name: 'id', type: 'string' }
]
});
Ext.define('Shopware.apps.Base.model.Captcha', {
alternateClassName: 'Shopware.model.Captcha',
extend: 'Ext.data.Model',
fields: [
{ name: 'id', type: 'string' },
{ name: 'displayname', type: 'string' }
]
});
Ext.define('Shopware.apps.Base.model.ProductBoxLayout', {
alternateClassName: 'Shopware.model.ProductBoxLayout',
extend: 'Shopware.data.Model',
fields: [
{ name: 'key', type: 'string' },
{ name: 'label', type: 'string' },
{ name: 'description', type: 'string' },
{ name: 'image', type: 'string' }
]
});
Ext.define('Shopware.apps.Base.model.PageNotFoundDestinationOptions', {
extend: 'Ext.data.Model',
alternateClassName: 'Shopware.model.PageNotFoundDestinationOptions',
fields: [
{ name: 'id', type: 'int' },
{ name: 'name', type: 'string' }
]
});
Ext.define('Shopware.model.AttributeConfig', {
extend: 'Shopware.data.Model',
fields: [
{ name: 'id', type: 'integer', useNull: true },
{ name: 'tableName', type: 'string' },
{ name: 'columnName', type: 'string' },
{ name: 'columnType', type: 'string' },
{ name: 'defaultValue', type: 'string', useNull: true, defaultValue: null },
{ name: 'entity', type: 'string', useNull: true },
{ name: 'dbalType', type: 'string' },
{ name: 'sqlType', type: 'string' },
{ name: 'label', type: 'string' },
{ name: 'helpText', type: 'string' },
{ name: 'supportText', type: 'string' },
{ name: 'translatable', type: 'boolean' },
{ name: 'displayInBackend', type: 'boolean', defaultValue: true },
{ name: 'readonly', type: 'boolean', defaultValue: false },
{ name: 'pluginId', type: 'integer' },
{ name: 'configured', type: 'boolean' },
{ name: 'position', type: 'integer' },
{ name: 'custom', type: 'boolean', defaultValue: false },
{ name: 'identifier', type: 'boolean' },
{ name: 'core', type: 'boolean' },
{ name: 'arrayStore', type: 'string' },
{ name: 'deleteButton', type: 'boolean' },
{ name: 'originalName', type: 'string', mapping: 'columnName' }
],
configure: function() {
return {
controller: 'Attributes'
};
},
allowDelete: function() {
if (this.get('core')) {
return false;
}
if (this.get('identifier')) {
return false;
}
return this.get('custom');
},
allowNameChange: function() {
if (this.get('identifier')) {
return false;
}
return this.get('custom');
},
allowTypeChange: function() {
if (this.get('identifier')) {
return false;
}
return this.get('custom') || this.get('core');
},
allowConfigure: function() {
return this.get('custom') || this.get('core');
},
merge: function(column) {
var me = this;
var fields = [
'columnName',
'columnType',
'entity',
'label',
'helpText',
'supportText',
'arrayStore',
'translatable',
'displayInBackend',
'pluginId',
'position',
'custom',
'dbalType',
'sqlType'
];
Ext.each(fields, function(field) {
me.set(field, column.get(field));
});
}
});
Ext.define('Shopware.apps.Base.model.CornerPosition', {
alternateClassName: 'Shopware.model.CornerPosition',
extend: 'Ext.data.Model',
fields: [
{ name: 'position', type: 'string' },
{ name: 'displayName', type: 'string' }
]
});
Ext.define('Shopware.apps.Base.model.CookieMode', {
alternateClassName: 'Shopware.model.CookieMode',
extend: 'Ext.data.Model',
fields: [
{
name: 'id',
type: 'integer'
},
{
name: 'name',
type: 'string'
}
],
});
Ext.define('Shopware.apps.Base.model.LandingPage', {
alternateClassName: 'Shopware.model.LandingPage',
extend: 'Shopware.data.Model',
idProperty: 'id',
fields: [
{ name: 'id', type: 'int' },
{ name: 'parentId', type: 'int', useNull: true, defaultValue: null },
{ name: 'groupingState', type: 'string' },
{ name: 'templateId', type: 'int', useNull: true, defaultValue: 1 },
{ name: 'active', type: 'boolean' },
{ name: 'showListing', type: 'boolean' },
{ name: 'listingVisibility', type: 'string' },
{ name: 'name', type: 'string' },
{ name: 'position', type: 'int', useNull: false, defaultValue: 1 },
{ name: 'device', type: 'string' },
{ name: 'fullscreen', type: 'int' },
{ name: 'rows', type: 'int', defaultValue: 20 },
{ name: 'cols', type: 'int', defaultValue: 4 },
{ name: 'cellSpacing', type: 'int', defaultValue: 10 },
{ name: 'cellHeight', type: 'int', defaultValue: 185 },
{ name: 'articleHeight', type: 'int', defaultValue: 2 },
{ name: 'validFrom', type: 'date', dateFormat: 'd.m.Y', useNull: true },
{ name: 'validTo', type: 'date', dateFormat: 'd.m.Y', useNull: true },
{ name: 'validToTime', type: 'date', dateFormat: 'H:i', useNull: true },
{ name: 'validFromTime', type: 'date', dateFormat: 'H:i', useNull: true },
{ name: 'userId', type: 'int' },
{ name: 'createDate', type: 'date', useNull: true },
{ name: 'modified', type: 'date', useNull: true },
{ name: 'template', type: 'string', defaultValue: 'Standard' },
{ name: 'isLandingPage', type: 'boolean' },
{ name: 'link', type: 'string' },
{ name: 'seoTitle', type: 'string' },
{ name: 'seoKeywords', type: 'string' },
{ name: 'seoDescription', type: 'string' },
{ name: 'categoriesNames', type: 'string' },
{ name: 'categories', type: 'array' },
{ name: 'mode', type: 'string', defaultValue: 'fluid' },
{ name: 'customerStreamIds', type: 'string', useNull: true, defaultValue: null },
{ name: 'replacement', type: 'string', useNull: true, defaultValue: null },
{ name: 'emotionGroup', persist: false },
{ name: 'selectedCategory', persist: false }
]
});
Ext.define('Shopware.apps.Base.model.Blog', {
alternateClassName: 'Shopware.model.Blog',
extend: 'Shopware.data.Model',
idProperty: 'id',
fields: [
{ name: 'id', type: 'int' },
{ name: 'title', type: 'string' },
{ name: 'shortDescription', type: 'string' },
{ name: 'description', type: 'string' },
{ name: 'active', type: 'boolean' },
{ name: 'views', type: 'int' },
{ name: 'displayDate', type: 'date' },
{ name: 'numberOfComments', type: 'int' },
{ name: 'name', convert: function (value, record) { return record.get('title'); } },
]
});
Ext.define('Shopware.apps.Base.model.Static', {
alternateClassName: 'Shopware.model.Static',
extend: 'Shopware.data.Model',
idProperty: 'id',
fields: [
{ name: 'key', type: 'string' },
{ name: 'id', type: 'string', convert: function(value, record) { return record.get('key') || value; } },
{ name: 'active', type: 'boolean', defaultValue: true },
{ name: 'description', type: 'string' },
{ name: 'text', convert: function(value, record) { return record.get('name') ? record.get('name') : value; } },
{ name: 'helperId', type: 'int' },
{ name: 'tpl1variable', type: 'string' },
{ name: 'tpl1path', type: 'string' },
{ name: 'tpl2variable', type: 'string' },
{ name: 'tpl2path', type: 'string' },
{ name: 'tpl3variable', type: 'string' },
{ name: 'tpl3path', type: 'string' },
{ name: 'html', type: 'string' },
{ name: 'parentId', type: 'string' },
{ name: 'html', type: 'string' },
{ name: 'grouping', type: 'string' },
{ name: 'shopIds' },
{ name: 'position', type: 'int' },
{ name: 'link', type: 'string' },
{ name: 'target', type: 'string' },
{ name: 'pageTitle', type: 'string' },
{ name: 'metaKeywords', type: 'string' },
{ name: 'metaDescription', type: 'string' },
{ name: 'name', convert: function (value, record) { return record.get('description'); } },
]
});
Ext.define('Shopware.apps.Base.store.User', {
alternateClassName: 'Shopware.store.User',
extend: 'Ext.data.Store',
storeId: 'base.User',
pageSize: 10,
autoLoad: false,
remoteSort: true,
remoteFilter: true,
model: 'Shopware.apps.Base.model.User',
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getUsers',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
});
Ext.define('Shopware.apps.Base.store.Category', {
alternateClassName: 'Shopware.store.Category',
extend: 'Ext.data.Store',
storeId: 'base.Category',
remoteSort: true,
remoteFilter: true,
model: 'Shopware.apps.Base.model.Category',
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getCategories',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
},
filters: [{
property: 'c.active',
value: 1
},{
property: 'c.parentId',
expression: '>=',
value: 1
}]
}).create();
Ext.define('Shopware.apps.Base.store.CategoryTree', {
alternateClassName: 'Shopware.store.CategoryTree',
extend: 'Ext.data.TreeStore',
storeId: 'base.CategoryTree',
autoLoad: false,
model: 'Shopware.apps.Base.model.Category',
proxy: {
type: 'ajax',
api: {
read: '/stageware12/backend/category/getList'
},
reader: {
type: 'json',
root: 'data'
}
}
}).create();
Ext.define('Shopware.apps.Base.store.CustomerGroup', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.CustomerGroup',
storeId: 'base.CustomerGroup',
model: 'Shopware.apps.Base.model.CustomerGroup',
pageSize: 1000,
remoteFilter: true,
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getCustomerGroups',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
}).create();
Ext.define('Shopware.apps.Base.store.Dispatch', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.Dispatch',
storeId: 'base.Dispatch',
model: 'Shopware.apps.Base.model.Dispatch',
pageSize: 1000,
remoteFilter: true,
sorters: [{
property: 'position',
direction: 'ASC'
}],
filters: [{
property: 'active',
value: true
}],
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getDispatches',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
}).create();
Ext.define('Shopware.apps.Base.store.DocType', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.DocType',
storeId: 'base.DocType',
model: 'Shopware.apps.Base.model.DocType',
pageSize: 1000,
remoteFilter: true,
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getDocTypes',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
}).create();
Ext.define('Shopware.apps.Base.store.Payment', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.Payment',
storeId: 'base.Payment',
model: 'Shopware.apps.Base.model.Payment',
pageSize: 1000,
remoteFilter: true,
sorters: [{
property: 'position',
direction: 'ASC'
}],
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getPayments',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
}).create();
Ext.define('Shopware.apps.Base.store.Shop', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.Shop',
storeId: 'base.Shop',
model: 'Shopware.apps.Base.model.Shop',
pageSize: 1000,
remoteSort: true,
remoteFilter: true,
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getShops',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
},
filters: [{
property: 'main',
value: null
}]
}).create();
Ext.define('Shopware.apps.Base.store.ShopLanguage', {
extend: 'Shopware.apps.Base.store.Shop',
alternateClassName: 'Shopware.store.ShopLanguage',
storeId: 'base.ShopLanguage',
filters: [ ]
}).create();
Ext.define('Shopware.apps.Base.store.Translation', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.Translation',
storeId: 'base.Translation',
model: 'Shopware.apps.Base.model.Shop',
pageSize: 1000,
remoteSort: true,
remoteFilter: true,
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getShops',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
},
filters: [{
property: 'default',
value: false
}]
}).create();
Ext.define('Shopware.apps.Base.store.Supplier', {
alternateClassName: 'Shopware.store.Supplier',
extend: 'Ext.data.Store',
storeId: 'base.Supplier',
autoLoad: false,
remoteSort: true,
remoteFilter: true,
model: 'Shopware.apps.Base.model.Supplier',
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getSuppliers',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
}).create();
Ext.define('Shopware.apps.Base.store.Country', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.Country',
storeId: 'base.Country',
model: 'Shopware.apps.Base.model.Country',
pageSize: 1000,
remoteFilter: true,
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getCountries',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
}).create();
Ext.define('Shopware.apps.Base.store.Article', {
alternateClassName: 'Shopware.store.Article',
extend: 'Ext.data.Store',
storeId: 'base.Article',
pageSize: 10,
autoLoad: false,
remoteSort: true,
remoteFilter: true,
model: 'Shopware.apps.Base.model.Article',
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getArticles',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
});
Ext.define('Shopware.apps.Base.store.Variant', {
extend: 'Ext.data.Store',
model: 'Shopware.apps.Base.model.Variant',
pageSize: 10,
autoLoad: false,
remoteSort: true,
remoteFilter: true,
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getVariants',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
});
Ext.define('Shopware.apps.Base.store.Locale', {
extend: 'Ext.data.Store',
alternateClassName: [
'Shopware.store.Locale',
'Shopware.store.Locales',
'Shopware.apps.Base.store.Locales'
],
storeId: 'base.Locale',
model: 'Shopware.apps.Base.model.Locale',
pageSize: 1000,
remoteFilter: true,
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getLocales',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
}).create();
Ext.define('Shopware.apps.Base.store.Currency', {
extend: 'Ext.data.Store',
alternateClassName: [
'Shopware.store.Currency'
],
storeId: 'base.Currency',
model: 'Shopware.apps.Base.model.Currency',
pageSize: 1000,
remoteFilter: true,
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getCurrencies',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
}).create();
Ext.define('Shopware.apps.Base.store.PaymentStatus', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.PaymentStatus',
storeId: 'base.PaymentStatus',
model: 'Shopware.apps.Base.model.PaymentStatus',
pageSize: 1000,
autoLoad: false,
remoteFilter: true,
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getPaymentStatus',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
}).create();
Ext.define('Shopware.apps.Base.store.OrderStatus', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.OrderStatus',
storeId: 'base.OrderStatus',
model: 'Shopware.apps.Base.model.OrderStatus',
pageSize: 1000,
autoLoad: false,
remoteFilter: true,
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getOrderStatus',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
}).create();
Ext.define('Shopware.apps.Base.store.Tax', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.Tax',
storeId: 'base.Tax',
model: 'Shopware.apps.Base.model.Tax',
pageSize: 1000,
remoteFilter: true,
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getTaxes',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
});
Ext.define('Shopware.apps.Base.store.Template', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.Template',
storeId: 'base.Template',
model: 'Shopware.apps.Base.model.Template',
pageSize: 1000,
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getTemplates',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
}).create();
Ext.define('Shopware.apps.Base.store.CountryArea', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.CountryArea',
storeId: 'base.CountryArea',
model: 'Shopware.apps.Base.model.CountryArea',
pageSize: 1000,
remoteFilter: true,
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getCountryAreas',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
}).create();
Ext.define('Shopware.apps.Base.store.CountryState', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.CountryState',
storeId: 'base.CountryState',
model: 'Shopware.apps.Base.model.CountryState',
pageSize: 1000,
remoteFilter: true,
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getCountryStates',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
}).create();
Ext.define('Shopware.apps.Base.store.Form', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.Form',
storeId: 'base.Form',
model: 'Shopware.apps.Base.model.Form',
proxy: {
type: 'ajax',
url: '/stageware12/backend/config/getForm',
api: {
create: '/stageware12/backend/config/saveForm',
update: '/stageware12/backend/config/saveForm',
destroy: '/stageware12/backend/config/deleteForm'
},
reader: {
type: 'json',
root: 'data'
}
}
});
Ext.define('Shopware.apps.Base.store.PositionStatus', {
extend: 'Ext.data.Store',
autoLoad: false,
model: 'Shopware.apps.Base.model.PositionStatus',
alternateClassName: 'Shopware.store.PositionStatus',
storeId: 'base.PositionStatus',
pageSize: 1000,
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getDetailStatus',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
});
Ext.define('Shopware.apps.Base.store.PasswordEncoder', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.PasswordEncoder',
storeId: 'base.PasswordEncoder',
model: 'Shopware.apps.Base.model.PasswordEncoder',
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getAvailableHashes',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
}).create();
Ext.define('Shopware.apps.Base.store.Captcha', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.Captcha',
storeId: 'base.Captcha',
model: 'Shopware.apps.Base.model.Captcha',
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getAvailableCaptchas',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
}).create();
Ext.define('Shopware.apps.Base.store.ProductBoxLayout', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.ProductBoxLayout',
storeId: 'base.ProductBoxLayout',
model: 'Shopware.apps.Base.model.ProductBoxLayout',
pageSize: 1000,
defaultLayouts: {
displayExtendLayout: false,
displayBasicLayout: true,
displayMinimalLayout: true,
displayImageLayout: true,
displayListLayout: false
},
snippets: {
displayExtendLayout: {
label: 'Vererbt',
description: 'Das Layout der Produkt-Box wird von der Eltern-Kategorie übernommen.'
},
displayBasicLayout: {
label: 'Detaillierte Informationen',
description: 'Das Layout der Produkt-Box zeigt detaillierte Informationen an.'
},
displayMinimalLayout: {
label: 'Nur wichtige Informationen',
description: 'Das Layout der Produkt-Box zeigt nur die wichtigsten Informationen an.'
},
displayImageLayout: {
label: 'Großes Bild',
description: 'Das Layout der Produkt-Box zeigt ein besonders großes Produkt-Bild.'
},
displayListLayout: {
label: 'Produktliste',
description: 'Das Layout der Produkt-Box zeigt detaillierte Informationen an, jedoch nur ein Produkt pro Zeile.'
}
},
constructor: function(config) {
var me = this,
data = [];
data = me.createLayoutData(config);
me.data = data;
me.callParent(arguments);
},
createLayoutData: function(config) {
var me = this,
data = [];
if (me.getConfigValue(config, 'displayExtendLayout')) {
data.push({
key: 'extend',
label: me.snippets.displayExtendLayout.label,
description: me.snippets.displayExtendLayout.description,
image: '/stageware12/themes/Backend/ExtJs/backend/_resources/images/category/layout_box_parent.png'
});
}
if (me.getConfigValue(config, 'displayBasicLayout')) {
data.push({
key: 'basic',
label: me.snippets.displayBasicLayout.label,
description: me.snippets.displayBasicLayout.description,
image: '/stageware12/themes/Backend/ExtJs/backend/_resources/images/category/layout_box_basic.png'
});
}
if (me.getConfigValue(config, 'displayMinimalLayout')) {
data.push({
key: 'minimal',
label: me.snippets.displayMinimalLayout.label,
description: me.snippets.displayMinimalLayout.description,
image: '/stageware12/themes/Backend/ExtJs/backend/_resources/images/category/layout_box_minimal.png'
});
}
if (me.getConfigValue(config, 'displayImageLayout')) {
data.push({
key: 'image',
label: me.snippets.displayImageLayout.label,
description: me.snippets.displayImageLayout.description,
image: '/stageware12/themes/Backend/ExtJs/backend/_resources/images/category/layout_box_image.png'
});
}
if (me.getConfigValue(config, 'displayListLayout')) {
data.push({
key: 'list',
label: me.snippets.displayListLayout.label,
description: me.snippets.displayListLayout.description,
image: '/stageware12/themes/Backend/ExtJs/backend/_resources/images/category/layout_box_list.png'
});
}
return data;
},
getConfigValue: function(config, property) {
if (!Ext.isObject(config)) {
return this.defaultLayouts[property];
}
if (!config.hasOwnProperty(property)) {
return this.defaultLayouts[property];
}
return config[property];
}
});
Ext.define('Shopware.apps.Base.store.ListingFilterMode', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.ListingFilterMode',
storeId: 'base.ListingFilterMode',
fields: [
{ name: 'key', type: 'string' },
{ name: 'label', type: 'string' },
{ name: 'description', type: 'string' },
{ name: 'image', type: 'string' }
],
pageSize: 1000,
defaultModes: {
displayFullPageReload: true,
displayReloadProductsMode: true,
displayReloadFiltersMode: true
},
fullPageReload: {
key: 'full_page_reload',
label: 'Filterbutton anzeigen',
description: 'Das Produktlisting wird über einen Button neu geladen.',
image: '/stageware12/themes/Backend/ExtJs/backend/_resources/images/listing_mode/full_page_reload.jpg'
},
reloadProductsMode: {
key: 'product_ajax_reload',
label: 'Produkte live nachladen',
description: 'Beim Filtern einer Produktliste wird diese direkt live nachgeladen.',
image: '/stageware12/themes/Backend/ExtJs/backend/_resources/images/listing_mode/product_ajax_reload.jpg'
},
reloadFiltersMode: {
key: 'filter_ajax_reload',
label: 'Produkte & Filter live nachladen',
description: 'Beim Filtern einer Produktliste wird diese direkt live nachgeladen. Nicht mehr kombinierbare Filter werden deaktiviert.',
image: '/stageware12/themes/Backend/ExtJs/backend/_resources/images/listing_mode/filter_ajax_reload.jpg'
},
constructor: function(config) {
var me = this,
data = [];
if (this.getConfigValue(config, 'displayFullPageReload')) {
data.push(me.fullPageReload);
}
if (this.getConfigValue(config, 'displayReloadProductsMode')) {
data.push(me.reloadProductsMode);
}
if (this.getConfigValue(config, 'displayReloadFiltersMode')) {
data.push(me.reloadFiltersMode);
}
this.data = data;
this.callParent(arguments);
},
getConfigValue: function(config, property) {
if (!Ext.isObject(config)) {
return this.defaultModes[property];
}
if (!config.hasOwnProperty(property)) {
return this.defaultModes[property];
}
return config[property];
}
});
Ext.define('Shopware.apps.Base.store.PageNotFoundDestinationOptions', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.PageNotFoundDestinationOptions',
model: 'Shopware.apps.Base.model.PageNotFoundDestinationOptions',
storeId: 'base.PageNotFoundDestinationOptions',
remoteFilter: true,
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getPageNotFoundDestinationOptions',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
}
}).create();
Ext.define('Shopware.store.AttributeConfig', {
extend: 'Shopware.store.Listing',
model: 'Shopware.model.AttributeConfig',
remoteSort: false,
configure: function() {
return {
controller: 'AttributeData'
}
}
});
Ext.define('Shopware.apps.Base.store.Salutation', {
extend: 'Ext.data.Store',
idProperty: 'key',
fields: [
{ name: 'id', type: 'string', mapping: 'key' },
{ name: 'key', type: 'string' },
{ name: 'label', type: 'string' }
],
proxy: {
type: 'ajax',
url: '/stageware12/backend/Base/getSalutations',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
},
getByKey: function(key) {
var salutation = key;
this.each(function(item) {
if (item.get('key') === key) {
salutation = item.get('label');
}
});
return salutation;
}
});
Ext.define('Shopware.apps.Base.store.CornerPosition', {
extend: 'Ext.data.Store',
alternateClassName: 'Shopware.store.CornerPosition',
storeId: 'base.CornerPosition',
model: 'Shopware.apps.Base.model.CornerPosition',
data: [
{ position: 'top-right', displayName: 'Oben rechts' },
{ position: 'bottom-right', displayName: 'Unten rechts' },
{ position: 'top-left', displayName: 'Oben links' },
{ position: 'bottom-left', displayName: 'Unten links' }
]
}).create();
Ext.define('Shopware.apps.Base.store.CookieMode', {
extend: 'Ext.data.Store',
model: 'Shopware.apps.Base.model.CookieMode',
alternateClassName: 'Shopware.store.CookieMode',
storeId: 'base.CookieMode',
data: [
{
id: 0, // Shopware\Components\Privacy\CookieRemoveSubscriber::COOKIE_MODE_NOTICE
name: 'Nur Hinweis anzeigen'
},
{
id: 1, // Shopware\Components\Privacy\CookieRemoveSubscriber::COOKIE_MODE_TECHNICAL
name: 'Technisch notwendige Cookies erlauben (Browser-Sitzung, CSRF), restliche nach Erlaubnis setzen'
},
{
id: 2, // Shopware\Components\Privacy\CookieRemoveSubscriber::COOKIE_MODE_ALL
name: 'Cookies erst nach Erlaubnis setzen'
}
]
});
Ext.define('Shopware.apps.Base.store.LandingPage', {
alternateClassName: 'Shopware.store.LandingPage',
extend: 'Ext.data.Store',
storeId: 'base.LandingPage',
remoteSort: true,
remoteFilter: true,
model: 'Shopware.apps.Base.model.LandingPage',
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getLandingPages',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
},
}).create();
Ext.define('Shopware.apps.Base.store.Blog', {
alternateClassName: 'Shopware.store.Blog',
extend: 'Ext.data.Store',
storeId: 'base.Blog',
remoteSort: true,
remoteFilter: true,
model: 'Shopware.apps.Base.model.Blog',
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getBlogs',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
},
}).create();
Ext.define('Shopware.apps.Base.store.Static', {
alternateClassName: 'Shopware.store.Static',
extend: 'Ext.data.Store',
storeId: 'base.Static',
remoteSort: true,
remoteFilter: true,
model: 'Shopware.apps.Base.model.Static',
proxy: {
type: 'ajax',
url: '/stageware12/backend/base/getStatics',
reader: {
type: 'json',
root: 'data',
totalProperty: 'total'
}
},
}).create();
Ext.define('Shopware.button.HoverButton', {
extend: 'Ext.button.Button',
alias: 'widget.hoverbutton',
menuHoverEnabled: ('1' === '1'),
afterRender: function() {
var me = this;
me.callParent(arguments);
if (me.menuHoverEnabled) {
me.getEl().on('mouseover', me.onClick, me);
}
},
onClick: function(event) {
var me = this;
if (me.preventDefault || (me.disabled && me.getHref()) && event) {
event.preventDefault();
}
if (!me.disabled) {
me.doToggle();
me.maybeShowMenu();
me.fireHandler(event);
}
}
});
Ext.define('Shopware.MediaManager.MediaSelection',
{
extend: 'Ext.form.field.Trigger',
alternateClassName: [ 'Shopware.form.field.MediaSelection', 'Shopware.MediaSelection' ],
alias: [ 'widget.mediafield', 'widget.mediaselectionfield' ],
uses: [ 'Ext.button.Button', 'Ext.Component', 'Ext.layout.component.field.Field' ],
componentLayout: 'triggerfield',
buttonConfig: null,
buttonText: 'Datei(en) auswählen...',
buttonIconCls: 'sprite-inbox-image',
buttonOnly: false,
buttonMargin: 3,
readOnly: true,
multiSelect: true,
albumId: null,
returnValue: 'path',
valueField: null,
onRender: function() {
var me = this,
inputEl, buttonWrap, mediaButton;
if (me.valueField) {
me.returnValue = me.valueField;
}
me.callParent(arguments);
me.registerEvents();
if (me.disabled) {
me.disableItems();
}
inputEl = me.inputEl;
if(me.buttonOnly) {
inputEl.setDisplayed(false);
}
buttonWrap = Ext.get(me.id + '-browseButtonWrap');
mediaButton = buttonWrap.down('.' + Ext.baseCSSPrefix + 'form-mediamanager-btn');
buttonWrap.setStyle('width', mediaButton.getWidth() + ((!me.buttonOnly) ? 3 : 0) + 'px');
buttonWrap.on('click', me.onOpenMediaManager, me);
},
registerEvents: function() {
var me = this;
me.addEvents(
'renderMediaManagerButton',
'beforeOpenMediaManager',
'afterOpenMediaManager',
'selectMedia'
);
return true;
},
getRecords: function() {
if(!this.selectedRecords) {
return false;
}
return this.selectedRecords;
},
getRecordsCount: function() {
if(!this.selectedRecords) {
return 0;
}
return this.selectedRecords.length;
},
onOpenMediaManager: function() {
var me = this;
me.fireEvent('beforeOpenMediaManager', me);
Shopware.app.Application.addSubApplication({
name: 'Shopware.apps.MediaManager',
layout: 'small',
eventScope: me,
params: {
albumId: me.albumId
},
mediaSelectionCallback: me.onGetSelection,
selectionMode: me.multiSelect,
validTypes: me.validTypes || []
});
me.fireEvent('afterOpenMediaManager', me);
},
onGetSelection: function(btn) {
var me = this,
win = btn.up('window'),
dataPnl = win.down('.mediamanager-media-view'),
selModel, selected;
if(dataPnl.selectedLayout === 'grid') {
dataPnl = dataPnl.dataView;
} else {
dataPnl = dataPnl.cardContainer.getLayout().getActiveItem();
}
selModel = dataPnl.getSelectionModel();
selected = selModel.getSelection();
me.selectedRecords = selected;
me.fireEvent('selectMedia', me, me.selectedRecords, selModel);
if(me.selectedRecords.length > 1) {
var paths = [];
Ext.each(me.selectedRecords, function(record) {
paths.push(record.get(me.returnValue));
});
paths = paths.toString();
me.inputEl.dom.value = paths;
} else {
selected = me.selectedRecords[0];
me.inputEl.dom.value = selected.get(me.returnValue);
}
win.close();
},
onDestroy: function(){
Ext.destroyMembers(this, 'button');
this.callParent();
},
onEnable: function(){
var me = this;
me.callParent();
},
onDisable: function(){
this.callParent();
this.disableItems();
},
reset: function(){
var me = this;
if (me.rendered) {
me.inputEl.dom.value = '';
}
me.callParent();
},
disableItems: function(){
var button = this.button;
if (button) {
button.disable();
}
},
getTriggerMarkup: function() {
var me = this,
result,
btn = Ext.widget('button', Ext.apply({
preventDefault: false,
cls: Ext.baseCSSPrefix + 'form-mediamanager-btn small secondary',
style: (me.buttonOnly) ? '' : 'margin-left:' + me.buttonMargin + 'px',
text: me.buttonText,
iconCls: me.buttonIconCls
}, me.buttonConfig)),
btnCfg = btn.getRenderTree();
me.fireEvent('renderMediaManagerButton', me, btn);
result = '<td id="' + me.id + '-browseButtonWrap">' + Ext.DomHelper.markup(btnCfg) + '</td>';
btn.destroy();
return result;
}
});
Ext.define('Shopware.MediaManager.MediaTextSelection',
{
extend: 'Shopware.MediaManager.MediaSelection',
alternateClassName: [ 'Shopware.form.field.MediaTextSelection', 'Shopware.MediaTextSelection' ],
alias: [ 'widget.mediatextfield', 'widget.mediatextselectionfield' ],
readOnly: false,
multiSelect: false
});
Ext.apply(Ext.form.VTypes, {
password: function (val, field) {
if (field.initialPassField) {
var pwd = Ext.getCmp(field.initialPassField);
return (val == pwd.getValue());
}
return true;
},
passwordText: 'Die eingegebenen Passwörter sind nicht gleich'
});
Ext.apply(Ext.form.field.VTypes, {
missingValidationErrorText: 'The remote vType validation needs a validationErrorMsg property',
emailMask: /[a-z\u00C0-\u00FF0-9_\.\-@\+]/i,
remote: function (val, field) {
if (!field.validationUrl) {
return true;
}
if (!field.validationErrorMsg) {
Ext.Error.raise(this.missingValidationErrorText);
return false;
}
if (!field.rendered) {
return true;
}
if (!field.hasOwnProperty('hasBlurListener')) {
field.on('change', this.onFireRemoteValidation, this, { delay: 750 });
this.onFireRemoteValidation(field);
field.hasBlurListener = true;
}
return (field.hasOwnProperty('oldValid')) ? field.oldValid : true;
},
daterange: function (val, field) {
var date = field.parseDate(val);
if (!date) {
return false;
}
if (field.startDateField && (!this.dateRangeMax || (date.getTime() != this.dateRangeMax.getTime()))) {
var start = field.up('form').down('#' + field.startDateField);
start.setMaxValue(date);
start.validate();
this.dateRangeMax = date;
}
else if (field.endDateField && (!this.dateRangeMin || (date.getTime() != this.dateRangeMin.getTime()))) {
var end = field.up('form').down('#' + field.endDateField);
end.setMinValue(date);
end.validate();
this.dateRangeMin = date;
}
return true;
},
onFireRemoteValidation: function (field) {
var parameters, val = field.getValue();
if (Ext.isDefined(field.oldValid)) {
if (val == field.oldValue) {
return field.oldValid;
}
}
field.oldValue = val;
if (!field.validationRequestParams) {
parameters = {
value: val,
param: field.validationRequestParam
};
} else {
parameters = field.validationRequestParams;
parameters.value = val;
}
Ext.Ajax.request({
async: false,
url: field.validationUrl,
params: parameters,
success: function (response) {
var oldValid = field.oldValid;
if (!response.responseText) {
field.markInvalid(field.validationErrorMsg);
field.vtypeText = field.validationErrorMsg;
field.oldValid = false;
} else {
field.clearInvalid();
field.oldValid = true;
}
if (oldValid !== field.oldValid) {
field.fireEvent('validitychange', field, field.oldValid);
}
},
failure: function (response) {
Shopware.Msg.createGrowlMessage('', field.validationErrorMsg, '', 'growl', false);
return false;
}
});
}
});
Ext.define('Shopware.form.field.TinyMCE',
{
extend: 'Ext.form.field.TextArea',
alternateClassName: [ 'Shopware.form.TinyMCE', 'Ext.form.field.TinyMCE' ],
alias: [ 'widget.tinymcefield', 'widget.tinymce' ],
requires: [ 'Ext.form.field.TextArea', 'Ext.XTemplate' ],
uses: [ 'Shopware.MediaManager.MediaSelection' ],
initialized: false,
statics: {
settings: {
cleanup : false,
convert_urls : false,
media_strict : false,
relative_urls : true,
language: "de",
mode: "textareas",
theme: "advanced",
skin: "o2k7",
invalid_elements:'script,applet',
plugins: "media_selection,safari,pagebreak,style,layer,table,iespell,insertdatetime,preview,searchreplace,print,contextmenu,paste,directionality,fullscreen,visualchars,nonbreaking,xhtmlxtras,template",
theme_advanced_toolbar_location: "top",
theme_advanced_resizing: true,
theme_advanced_toolbar_align: "left",
theme_advanced_statusbar_location: "bottom",
extended_valid_elements : "font[size],iframe[frameborder|src|width|height|name|align|frameborder|allowfullscreen|id|class|style],script[src|type],object[width|height|classid|codebase|ID|value],param[name|value],embed[name|src|type|wmode|width|height|style|allowScriptAccess|menu|quality|pluginspage],video[autoplay|class|controls|id|lang|loop|onclick|ondblclick|onkeydown|onkeypress|onkeyup|onmousedown|onmousemove|onmouseout|onmouseover|onmouseup|preload|poster|src|style|title|width|height],audio[autoplay|class|controls|id|lang|loop|onclick|ondblclick|onkeydown|onkeypress|onkeyup|onmousedown|onmousemove|onmouseout|onmouseover|onmouseup|preload|src|style|title]",
document_base_url: 'https://www.indisplay.com/stageware12/backend/'.replace('/backend', ''),
content_css: 'https://www.indisplay.com/stageware12/themes/Backend/ExtJs/backend/_resources/styles/tiny_mce.css?_dc=' + new Date().getTime(),
skin_variant: 'silver',
theme_advanced_buttons1 : "save,newdocument,|,bold,italic,underline,strikethrough,|,justifyleft,justifycenter,justifyright,justifyfull,|,formatselect,fontselect,fontsizeselect",
theme_advanced_buttons2 : "cut,copy,paste,pastetext,pasteword,|,search,replace,|,bullist,numlist,|,outdent,indent,blockquote,|,undo,redo,|,link,unlink,anchor,image,cleanup,help,code",
theme_advanced_buttons3 : "tablecontrols,|,hr,removeformat,visualaid,|,sub,sup,|,charmap,emotions,iespell,media,advhr,ltr,rtl,|,fullscreen",
theme_advanced_buttons4 : "styleprops,|,cite,abbr,acronym,del,ins,attribs,|,visualchars,nonbreaking,template,pagebreak,|,insertdate,inserttime,preview,|,forecolor,backcolor,|,media_selection"
},
setGlobalSettings: function(userSettings) {
Ext.apply(this.settings, userSettings);
}
},
hasPlaceholder: false,
config: {
editor: { }
},
autoSize: Ext.emptyFn,
noSourceErrorText: "The TinyMCE editor source files aren't included in the project",
preloadImageUrl: '/stageware12/backend/MediaManager/getMediaUrls',
initComponent: function() {
var me = this;
me.callParent(arguments);
me.registerEvents();
},
registerEvents: function() {
var me = this;
me.addEvents(
'beforerendereditor',
'rendereditor',
'afterrendereditor'
);
return true;
},
onRender: function(ct, position) {
var me = this, el;
Ext.applyIf(me.subTplData, {
cols: me.cols,
rows: me.rows
});
me.callParent(arguments);
el = me.inputEl;
el.dom.setAttribute('tabIndex', -1);
el.addCls('x-hidden');
me.initEditor();
me.registerEditorEvents();
},
initEditor: function() {
var me = this, input = me.inputEl, height, placeholder = false;
if(!window.tinyMCE) {
Ext.Error.raise(me.noSourceErrorText);
}
me.config.editor = Ext.Object.merge(this.statics().settings, me.editor);
if(me.height) {
height = me.height - 12;
me.config.editor.height = height;
}
if (me.readOnly) {
me.config.editor.readonly = true;
me.config.editor.body_class = 'tinymce-readonly';
} else {
me.config.editor.readonly = false;
me.config.editor.body_class = '';
}
me.fireEvent('beforerendereditor', me, input.id, me.config.editor);
me.tinymce = new tinymce.Editor(input.id, me.config.editor);
me.fireEvent('rendereditor', me, me.tinymce, input.id, me.config.editor);
me.tinymce.onChange.add(function(ed, values) {
values.content = me.replaceImagePathsWithSmartyPlugin(values.content);
me.setRawValue(values.content);
});
me.tinymce.onInit.add(function(ed, evt) {
me.initialized = true;
me.setValue(ed.getContent());
var dom = ed.dom,
doc = ed.getDoc(),
el = doc.content_editable ? ed.getBody() : (tinymce.isGecko ? doc : ed.getWin());
document.addEventListener('insertMedia', function() {
me.replacePlaceholderWithImage(ed.getContent());
}, false);
if((!me.value || !me.value.length) && me.emptyText && me.emptyText.length) {
me.tinymce.setContent(me.emptyText);
me.hasPlaceholder = true;
tinymce.dom.Event.add(el, 'focus', function() {
var value = me.tinymce.getContent();
value = Ext.util.Format.stripTags(value);
if(value === me.emptyText) {
me.tinymce.setContent('');
}
});
}
tinymce.dom.Event.add(el, 'blur', function() {
var value = me.tinymce.getContent();
value = me.replaceImagePathsWithSmartyPlugin(value);
me.setRawValue(value);
value = Ext.util.Format.stripTags(value);
if(me.hasPlaceholder && !value.length || (value == me.emptyText)) {
me.tinymce.setContent(me.emptyText);
}
});
me.fixImageSelection();
me.changeSniffer = window.setInterval(function() {
var value = me.tinymce.getContent();
value = me.replaceImagePathsWithSmartyPlugin(value);
me.setRawValue(value);
}, 300);
if (me.readOnly) {
ed.dom.doc.firstElementChild.classList.add('tinymce-readonly');
}
});
me.tinymce.render();
me.fireEvent('afterrendereditor', me, me.tinymce, input.id, me.config.editor);
},
fixImageSelection: function() {
var me = this;
delete me.tinymce.onClick.listeners[2];
me.tinymce.onClick.listeners = Ext.Array.clean(me.tinymce.onClick.listeners);
me.tinymce.onClick.add(function(editor, e) {
e = e.target;
var selection = editor.selection;
if (/^(IMG|HR)$/.test(e.nodeName)) {
try {
selection.getSel().setBaseAndExtent(e, 0, e, 1); //Original behavior in 3.5.9; still works in Safari 10.1
} catch (ex) {
selection.getSel().setBaseAndExtent(e, 0, e, 0); //Updated behavior for Chrome 58+ (and, I'm guessing, future versions of Safari)
}
}
if (e.nodeName === 'A' && dom.hasClass(e, 'mceItemAnchor')) {
selection.select(e);
}
editor.nodeChanged();
});
},
_findImagesInDOMContent: function(content) {
var filteredImages = [],
images = content.getElementsByTagName('img');
Ext.each(images, function(img) {
if(img.classList.contains('tinymce-editor-image')) {
var src = img.getAttribute('data-src'),
id = img.getAttribute('id');
if (!id) {
src = img.getAttribute('src');
if (src && src.substr(0,5) != "media") {
return;
}
id = 'tinymce-editor-image-' + Shopware.ModuleManager.uuidGenerator.generate();
img.setAttribute('id', id);
img.setAttribute('data-src', src);
img.classList.add(id);
}
filteredImages.push({ src: src, id: id, image: img });
}
});
return filteredImages;
},
replaceImagePathsWithSmartyPlugin: function(rawContent) {
var me = this,
tpl = "{media path='[0]'}",
content, images, html;
if (!me.isValidContent(rawContent)) {
return rawContent;
}
content = me.HTMLBlobToDomElements(rawContent);
images = me._findImagesInDOMContent(content);
Ext.each(images, function(img) {
var element = content.getElementById(img.id),
src = element.getAttribute('src'),
dataSrc = element.getAttribute('data-src');
if(src.charAt(0) === '{') {
return;
}
element.setAttribute('src', Ext.String.format(tpl, dataSrc));
});
html = me.DOMElementsToHTMLBlob(content);
return html;
},
replaceSmartyPluginWithImagePaths: function(rawContent) {
var me = this, content, images;
if (!me.isValidContent(rawContent)) {
return rawContent;
}
content = me.HTMLBlobToDomElements(rawContent);
images = me._findImagesInDOMContent(content);
Ext.each(images, function(img) {
var element = content.getElementById(img.id);
element.setAttribute('src', '/stageware12/engine/Library/TinyMce/plugins/media_selection/assets/placeholder-image.png');
});
rawContent = me.DOMElementsToHTMLBlob(content);
return rawContent;
},
replacePlaceholderWithImage: function(rawContent, callback) {
var me = this,
imagesToLoad = [],
content, params = '';
if (!me.isValidContent(rawContent)) {
if (Ext.isFunction(callback)) {
callback(rawContent);
return;
} else {
return rawContent;
}
}
content = me.HTMLBlobToDomElements(rawContent);
imagesToLoad = me._findImagesInDOMContent(content);
Ext.each(imagesToLoad, function(img) {
params = params + 'paths[]=' + img.src + '&';
});
params = params.substring(0, params.length - 1);
if (params.length <= 0) {
if (Ext.isFunction(callback)) {
callback(rawContent);
return;
} else {
return rawContent;
}
}
Ext.Ajax.request({
url: me.preloadImageUrl + '?' + params,
success: function(response) {
var html;
response = JSON.parse(response.responseText);
if(!response.success) {
return false;
}
Ext.each(response.data, function(item, index) {
var originalImage = imagesToLoad[index],
element = content.getElementById(originalImage.id);
element.setAttribute('src', item);
});
html = me.DOMElementsToHTMLBlob(content);
if (Ext.isFunction(callback)) {
callback(html);
} else {
me.tinymce.setContent(html);
}
}
});
},
isValidContent: function(content) {
return (Ext.isDefined(content) && content !== null && content.length && content.length > 0);
},
HTMLBlobToDomElements: function(html) {
var dp = new DOMParser();
return dp.parseFromString(html, 'text/html');
},
DOMElementsToHTMLBlob: function(elements) {
return elements.body.innerHTML;
},
registerEditorEvents: function() {
var me = this;
me.on({
'resize': {
scope: me,
fn: me.onEditorResize
}
})
},
onEditorResize: function(view, width, height) {
var me = this, editor = me.tinymce,
edTable = Ext.get(editor.id + "_tbl"),
edIframe = Ext.get(editor.id + "_ifr"),
edToolbar = Ext.get(editor.id + "_xtbar");
if(!edTable) {
return false;
}
width = (width < 100) ? 100 : (width - 205);
height = (height < 129) ? 129 : (height - 100);
var toolbarWidth = width;
if(edTable) {
toolbarWidth = width - edTable.getFrameWidth( "lr" );
}
var toolbarHeight = 0;
if(edToolbar) {
toolbarHeight = edToolbar.getHeight();
var toolbarTd = edToolbar.findParent( "td", 5, true );
toolbarHeight += toolbarTd.getFrameWidth( "tb" );
edToolbar.setWidth( toolbarWidth );
}
var edStatusbarTd = edTable.child( ".mceStatusbar" );
var statusbarHeight = 0;
if(edStatusbarTd) {
statusbarHeight += edStatusbarTd.getHeight();
}
var iframeHeight = height - toolbarHeight - statusbarHeight;
var iframeTd = edIframe.findParent( "td", 5, true );
if(iframeTd)
iframeHeight -= iframeTd.getFrameWidth( "tb" );
edTable.setSize( width, height );
edIframe.setSize( toolbarWidth, iframeHeight );
},
getEditor: function() {
return this.tinymce;
},
setValue: function(value, editorChange) {
var me = this;
if(!me.initialized) {
value = me.replaceSmartyPluginWithImagePaths(value);
me.replacePlaceholderWithImage(value, function (value) {
value = value === null || value === undefined ? '' : value;
me.setRawValue(me.valueToRaw(value));
me.mixins.field.setValue.call(me, value);
if (me.tinymce) {
try {
me.tinymce.setContent(value);
} catch (e) {
}
}
});
return me;
}
if(!editorChange) {
me.setEditorValue(value, me);
if((!value || !value.length) && me.hasPlaceholder) {
me.setEditorValue(me.emptyText, me);
}
}
me.callParent(arguments);
return me;
},
setRawValue: function(value) {
var me = this;
me.callParent(arguments);
if(!me.initialized) {
return false;
}
return me;
},
setEditorValue: function(value, scope) {
var me = scope;
if(!me.initialized || !me.tinymce) {
me.on('afterrendereditor', function() {
me.setEditorValue(value, me);
}, me, { single: true });
return false;
}
if(me.tinymce.undoManager) {
me.tinymce.undoManager.clear();
}
value = me.replaceSmartyPluginWithImagePaths(value);
me.replacePlaceholderWithImage(value);
me.tinymce.setContent(value === null || value === undefined ? '' : value);
me.tinymce.startContent = me.tinymce.getContent({ format: 'raw' });
me.replacePlaceholderWithImage(value);
return true;
},
focus: function(selectText, delay) {
var me = this;
if(delay) {
if (!me.focusTask) {
me.focusTask = Ext.create('Ext.util.DelayedTask', me.focus);
}
me.focusTask.delay(Ext.isNumber(delay) ? delay : 10, null, me, [selectText, false]);
return me;
}
me.tinymce.focus();
if(selectText) {
var edIframe = Ext.get(me.tinymce.id + "_ifr"),
dom = edIframe.dom,
doc = dom.contentDocument,
win = dom.contentWindow,
selection = win.getSelection(),
range = doc.createRange();
range.selectNodeContents(doc.body);
selection.removeAllRanges();
selection.addRange(range);
}
return me;
},
destroy: function() {
var me = this;
me.callParent(arguments);
clearInterval(me.changeSniffer);
Ext.destroyMembers(me, 'tinymce');
},
enable: function(slient) {
var me = this;
me.callParent(arguments);
if(!me.tinymce || !me.initialized) {
return me;
}
var bodyEl = me.tinymce.getBody();
bodyEl = Ext.get(bodyEl);
if(bodyEl.hasCls('mceNonEditable')) {
bodyEl.removeCls('mceNonEditable');
bodyEl.addCls('mceContentBody');
}
me.tinymce.getBody().setAttribute('contenteditable', true);
return me;
},
disable: function(silent) {
var me = this;
me.callParent(arguments);
if(!me.tinymce || !me.initialized) {
return me;
}
var bodyEl = me.tinymce.getBody();
bodyEl = Ext.get(bodyEl);
if(bodyEl.hasCls('mceContentBody')) {
bodyEl.removeCls('mceContentBody');
bodyEl.addCls('mceNonEditable');
}
me.tinymce.getBody().setAttribute('contenteditable', false);
return me;
}
});
Ext.define('Shopware.form.plugin.Translation',
{
extend: 'Ext.AbstractPlugin',
alternateClassName: [ 'Shopware.form.Translation', 'Shopware.plugin.Translation' ],
alias: 'plugin.translation',
translationType: 'article',
translationCallback: Ext.emptyFn,
translationKey: null,
translationMerge: false,
icons: [],
uses: [ 'Ext.DomHelper', 'Ext.Element' ],
init: function(form) {
var me = this;
me.initConfig(form);
form.on('afterrender', function() {
me.initTranslationFields(form);
});
form.getForm().on('recordchange', function() {
me.initTranslationFields(form);
});
form.translationPlugin = this;
me.callParent(arguments);
},
initConfig: function (form) {
form._translationConfig = {
translationType: this.translationType,
translationKey: this.translationKey,
translationCallback: this.translationCallback,
translationMerge: this.translationMerge
};
},
initTranslationFields: function(form) {
var me = this;
var config = form._translationConfig;
var record = form.getForm().getRecord();
if (!config.translationKey && typeof record === 'undefined') {
return;
}
if (!config.translationKey && record.phantom) {
return;
}
var fields = me.getTranslatableFields(form);
Ext.each(fields, function(field) {
me.createGlobeElement(form, field);
});
},
getTranslatableFields: function(form) {
var fields = [];
Ext.each(form.getForm().getFields().items, function(field) {
var config = field.initialConfig;
if (config.translatable && !field.isDisabled()) {
fields.push(field);
}
});
return fields;
},
createGlobeElement: function(form, field) {
var me = this, type, style, globeIcon;
style = me.getGlobeElementStyle(field);
globeIcon = new Ext.Element(document.createElement('span'));
globeIcon.set({
cls: Ext.baseCSSPrefix + 'translation-globe sprite-globe',
style: 'position: absolute;width: 16px; height: 16px;display:block;cursor:pointer;'+style
});
globeIcon.addListener('click', function() {
me.openTranslationWindow(form);
});
if (field.getEl()) {
field.getEl().setStyle('position', 'relative');
}
try {
if (field.globeIcon) {
field.globeIcon.removeListener('click');
field.globeIcon.remove();
}
} catch (e) { }
field.globeIcon = globeIcon;
if (Ext.isFunction(field.insertGlobeIcon)) {
field.insertGlobeIcon(globeIcon);
} else if (field.inputEl) {
globeIcon.insertAfter(field.inputEl);
}
},
getGlobeElementStyle: function(field) {
switch(this.getFieldType(field)) {
case 'tinymce':
return 'top: 3px; right: 3px';
case 'codemirror':
return 'top: 6px; right: 26px;z-index:999999';
case 'textarea':
return 'top: 6px; right: 6px';
case 'trigger':
return 'top: 6px; right: 26px';
case 'textfield':
default:
return 'top: 6px; right: 6px; z-index:1;';
}
},
openTranslationWindow: function(form) {
var me = this;
var config = form._translationConfig;
var key = config.translationKey || form.getForm().getRecord().getId();
var fields = me.createTranslationFields(form);
Shopware.app.Application.addSubApplication({
name: 'Shopware.apps.Translation',
eventScope: me,
translationCallback: config.translationCallback,
translatableFields: fields,
translationType: config.translationType,
translationMerge: config.translationMerge,
translationKey: key
});
},
createTranslationFields: function(form) {
var me = this;
var fields = me.getTranslatableFields(form);
var result = [];
Ext.each(fields, function(field) {
var config = Ext.clone(field.initialConfig);
if (!config.allowBlank) {
config.allowBlank = true;
}
if (config.listeners) {
config.listeners = { };
}
if (config.translationLabel) {
config.fieldLabel = config.translationLabel;
}
if (config.translationName) {
config.name = config.translationName;
}
if (!config.fieldLabel) {
config.fieldLabel = '&nbsp';
config.labelSeparator = '';
}
config.labelWidth = 130;
if (!config.xtype) {
config.xtype = field.xtype;
}
if (field.getValue()) {
if (config.xtype != 'tinymce') {
config.emptyText = field.getValue();
if (config.xtype === 'productstreamselection') {
config.emptyText = field.store.findRecord('id', config.emptyText).get('name');
}
}
if (config.xtype == 'checkbox') {
config.checked = field.checked;
}
}
result.push(config)
});
return result;
},
getFieldType: function(field) {
var type = null;
Ext.each(field.alternateClassName, function(className) {
if(className === 'Ext.form.TextField') {
type = 'textfield';
}
if(className === 'Shopware.form.TinyMCE') {
type = 'tinymce';
}
if(className === 'Shopware.form.CodeMirror') {
type = 'codemirror';
}
if(className === 'Ext.form.TextArea') {
type = 'textarea';
}
if(className === 'Ext.form.TriggerField'
|| className === 'Ext.form.ComboBox'
|| className === 'Ext.form.DateField'
|| className === 'Ext.form.Picker'
|| className === 'Ext.form.Spinner'
|| className === 'Ext.form.NumberField'
|| className === 'Ext.form.Number'
|| className === 'Ext.form.TimeField') {
type = 'trigger';
}
});
return type;
}
});
Ext.define('Shopware.form.plugin.SnippetTranslation',
{
extend: 'Ext.AbstractPlugin',
alias: 'plugin.snippet-translation',
namespace: null,
icons: [],
uses: [ 'Ext.DomHelper', 'Ext.Element' ],
init: function(form) {
var me = this;
form._snippetTranslationConfig = {
namespace: me.namespace,
getSnippetName: me.getSnippetName
};
form.on('afterrender', function() {
me.initTranslationFields(form);
});
form.getForm().on('recordchange', function() {
me.initTranslationFields(form);
});
form.snippetTranslationPlugin = this;
me.callParent(arguments);
},
initTranslationFields: function(form) {
var me = this;
var config = form._snippetTranslationConfig;
var record = form.getForm().getRecord();
var fields = me.getTranslatableFields(form);
Ext.each(fields, function(field) {
if (field.snippetGlobeIcon) {
field.snippetGlobeIcon.removeListener('click');
field.snippetGlobeIcon.remove();
}
});
if (!config.namespace && typeof record === 'undefined') {
return;
}
if (!config.namespace && record.phantom) {
return;
}
if (!record || !record.get('id')) {
return
}
if (!Ext.isFunction(config.getSnippetName)) {
return;
}
Ext.each(fields, function(field) {
me.createGlobeElement(form, field);
});
},
getTranslatableFields: function(form) {
var fields = [];
Ext.each(form.getForm().getFields().items, function(field) {
var config = field.initialConfig;
if (config.translatable && !field.isDisabled()) {
fields.push(field);
}
});
return fields;
},
createGlobeElement: function(form, field) {
var me = this, style, snippetGlobeIcon;
style = me.getGlobeElementStyle(field);
snippetGlobeIcon = new Ext.Element(document.createElement('span'));
snippetGlobeIcon.set({
cls: 'settings--snippets',
style: 'position: absolute;width: 16px; height: 16px;display:block;cursor:pointer;'+style
});
snippetGlobeIcon.addListener('click', function() {
me.openTranslationWindow(form, field);
});
if (field.getEl()) {
field.getEl().setStyle('position', 'relative');
}
try {
if (field.snippetGlobeIcon) {
field.snippetGlobeIcon.removeListener('click');
field.snippetGlobeIcon.remove();
}
} catch (e) { }
field.snippetGlobeIcon = snippetGlobeIcon;
if (Ext.isFunction(field.insertGlobeIcon)) {
field.insertGlobeIcon(snippetGlobeIcon);
} else if (field.inputEl) {
snippetGlobeIcon.insertAfter(field.inputEl);
}
},
getGlobeElementStyle: function(field) {
switch(this.getFieldType(field)) {
case 'tinymce':
return 'top: 3px; right: 3px';
case 'codemirror':
return 'top: 6px; right: 26px;z-index:999999';
case 'textarea':
return 'top: 6px; right: 6px';
case 'trigger':
return 'top: 6px; right: 26px';
case 'textfield':
default:
return 'top: 6px; right: 6px; z-index:1;';
}
},
openTranslationWindow: function(form, field) {
var config = form._snippetTranslationConfig;
Shopware.app.Application.addSubApplication({
name: 'Shopware.apps.Snippet',
action: 'detail',
shopId: 1,
snippet: {
name: config.getSnippetName(field),
namespace: config.namespace
}
});
},
getFieldType: function(field) {
var type = null;
Ext.each(field.alternateClassName, function(className) {
if(className === 'Ext.form.TextField') {
type = 'textfield';
}
if(className === 'Shopware.form.TinyMCE') {
type = 'tinymce';
}
if(className === 'Shopware.form.CodeMirror') {
type = 'codemirror';
}
if(className === 'Ext.form.TextArea') {
type = 'textarea';
}
if(className === 'Ext.form.TriggerField'
|| className === 'Ext.form.ComboBox'
|| className === 'Ext.form.DateField'
|| className === 'Ext.form.Picker'
|| className === 'Ext.form.Spinner'
|| className === 'Ext.form.NumberField'
|| className === 'Ext.form.Number'
|| className === 'Ext.form.TimeField') {
type = 'trigger';
}
});
return type;
}
});
Ext.define('Shopware.grid.HeaderToolTip', {
extend: 'Ext.AbstractPlugin',
alias: 'plugin.headertooltip',
uses: [ 'Ext.tip.ToolTip' ],
client: null,
showIcons: true,
init: function(client) {
var me = this;
me.callParent(arguments);
me.client = client;
me.client.headerCt.on("afterrender", me.onAfterRender, me);
},
onAfterRender: function() {
var me = this,
headerCt = me.client.headerCt,
grid = me.client;
if (me.showIcons) {
me.wrapColumnsWithSpan(headerCt.getGridColumns());
}
grid.tip = me.getToolTip();
grid.tip.on("beforeshow", me.onBeforeShow, me);
},
wrapColumnsWithSpan: function(columns) {
Ext.each(columns, function(column) {
if (column.tooltip) {
var el = column.el;
var tooltipclass = Ext.baseCSSPrefix + "tooltip"
el.update('<span class="' + tooltipclass + '">' + el.dom.innerHTML + '</span>');
}
});
},
getToolTip: function() {
var me = this;
headerCt = me.client.headerCt;
return Ext.create('Ext.tip.ToolTip', {
target: headerCt.el,
delegate: "." + Ext.baseCSSPrefix + "column-header",
trackMouse: true,
renderTo: Ext.getBody()
});
},
onBeforeShow: function(tip) {
var me = this;
headerCt = me.client.headerCt;
var column = headerCt.down('gridcolumn[id=' + tip.triggerElement.id  +']');
if (column && column.tooltip) {
tip.update(Ext.util.Format.htmlEncode(column.tooltip));
} else {
tip.clearTimers();
return false;
}
},
destroy: function() {
this.client.headerCt.un("afterrender");
this.callParent(arguments);
}
});
Ext.define('Shopware.Notification', {
extend: 'Ext.app.Controller',
singleton: true,
alternateClassName: [ 'Shopware.Messages', 'Shopware.Msg' ],
requires: [ 'Ext.container.Container', 'Ext.panel.Panel', 'Ext.XTemplate' ],
baseMsgType: 'notice',
hideDelay: 1800,
easingType: 'easeIn',
animationDuration: 200,
alertWidth: 350,
alertMsgCls: 'alert-message',
blockMsgCls: 'block-message',
growlMsgCls: 'growl-msg',
growlMsgCollection: Ext.create('Ext.util.MixedCollection'),
offsetTop: 50,
offsetBottom: 50,
growlDisplayPosition: 'top-right',
growlDisplayBottom: false,
growlDisplayLeft: false,
alertMsgTpl: [
'<tpl for=".">',
'<div class="{type}">',
'<tpl if="closeBtn">',
'<a href="#" class="close close-alert">x</a>',
'</tpl>',
'<p>',
'<tpl if="title">',
'<strong>[Ext.String.getText(title)]</strong>&nbsp;',
'</tpl>',
'{text}',
'</p>',
'</div>',
'</tpl>'
],
blockMsgTpl: [
'<tpl for=".">',
'<p>',
'{text}',
'</p>',
'</tpl>'
],
growlMsgTpl: [
'<tpl for=".">',
'<div class="growl-icon {iconCls}"></div>',
'<div class="alert">',
'<tpl if="title">',
'<div class="title">{title}</div>',
'</tpl>',
'<p class="text">{text}</p>',
'</div>',
'</tpl>'
],
_validTypes: /(notice|info|success|error)/i,
closeText: 'Schließen',
constructor: function() {
var me = this;
switch (me.growlDisplayPosition) {
case 'top-right':
me.growlDisplayBottom = false;
me.growlDisplayLeft = false;
break;
case 'bottom-right':
me.growlDisplayBottom = true;
me.growlDisplayLeft = false;
break;
case 'top-left':
me.growlDisplayBottom = false;
me.growlDisplayLeft = true;
break;
case 'bottom-left':
me.growlDisplayBottom = true;
me.growlDisplayLeft = true;
break;
default:
me.growlDisplayBottom = false;
me.growlDisplayLeft = false;
break;
}
},
setBaseMsgType: function(type) {
if (!this.validBaseMsgType(type)) {
return false;
}
this.baseMsgType = type;
return true;
},
getBaseMsgType: function() {
return this.baseMsgType;
},
validBaseMsgType: function(type) {
return type.match(this._validTypes);
},
setAlertMsgCls: function(cls) {
this.alertMsgCls = cls;
},
getAlertMsgCls: function() {
return this.alertMsgCls;
},
setBlockMsgCls: function(cls) {
this.blockMsgCls = cls;
},
getBlockMsgCls: function() {
return this.blockMsgCls;
},
setGrowlMsgCls: function(cls) {
this.growlMsgCls = cls;
},
getGrowlMsgCls: function() {
return this.growlMsgCls;
},
createMessage: function(title, text, type, closeBtn) {
var me = this, alertMsg, msgData;
if (!me.validBaseMsgType(type)) {
type = false;
}
msgData = {
title: title || false,
text: text,
type: type || this.baseMsgType,
closeBtn: closeBtn || false
};
alertMsg = Ext.create('Ext.container.Container', {
ui: [ 'default', 'shopware-ui' ],
data: msgData,
cls: me.alertMsgCls,
tpl: me.alertMsgTpl,
width: me.alertWidth,
renderTo: Ext.getBody(),
style: 'opacity: 0'
});
alertMsg.update(msgData);
var task = new Ext.util.DelayedTask(function() {
me.closeAlertMessage(alertMsg, me, null);
});
task.delay(this.hideDelay);
if (closeBtn) {
Ext.getBody().on('click', function(event) {
me.closeAlertMessage(this, me, task);
}, alertMsg, {
delegate: '.close-alert'
});
}
alertMsg.getEl().fadeIn({
opacity: 1,
easing: me.easingType,
duration: me.animationDuration
});
return alertMsg;
},
createErrorMessage: function(title, text, closeBtn) {
closeBtn = closeBtn || false;
return this.createMessage(title, text, 'error', closeBtn);
},
createSuccessMessage: function(title, text, closeBtn) {
closeBtn = closeBtn || false;
return this.createMessage(title, text, 'success', closeBtn);
},
createNoticeMessage: function(title, text, closeBtn) {
closeBtn = closeBtn || false;
return this.createMessage(title, text, 'notice', closeBtn);
},
createInfoMessage: function(title, text, closeBtn) {
closeBtn = closeBtn || false;
return this.createMessage(title, text, 'info', closeBtn);
},
closeAlertMessage: function(alertMsg, scope, task) {
if (task && Ext.isObject(task)) {
task.cancel();
}
alertMsg.getEl().fadeOut({
remove: true,
easing: scope.easingType,
duration: scope.animationDuration
});
return true;
},
createBlockMessage: function(text, type) {
var me = this, pnl, msgData, innerPnl;
if (!me.validBaseMsgType(type)) {
type = me.baseMsgType;
}
msgData = {
text: text,
type: type || me.baseMsgType
};
innerPnl = Ext.create('Ext.container.Container', {
cls: [ me.blockMsgCls + '-inner', type || me.baseMsgType ],
data: msgData,
margin: 1,
padding: 7,
plain: true,
tpl: me.blockMsgTpl
});
pnl = Ext.create('Ext.container.Container', {
cls: me.blockMsgCls,
ui: 'shopware-ui',
bodyCls: type || me.baseMsgType,
items: [ innerPnl ]
});
innerPnl.update(msgData);
return pnl;
},
createGrowlStyle: function(messageWidth, messageHeight, componentTop) {
var me = this;
var style = {
'opacity': 1
};
if (me.growlDisplayLeft) {
style.left = 8 + 'px';
} else {
style.left = Ext.Element.getViewportWidth() - (messageWidth + 8) + 'px';
}
if (me.growlDisplayBottom) {
style.top = (Ext.Element.getViewportHeight() - componentTop - messageHeight) + 'px';
} else {
style.top = componentTop + 'px';
}
return style;
},
createGrowlMessage: function(title, text, caller, iconCls, log) {
var me = this,
msgData,
growlMsg,
id = Ext.id(),
compTop = me.offsetTop,
style;
text = text || '';
if (log != false) {
Ext.Ajax.request({
url: '/stageware12/backend/Logger/createLog',
params: {
type: 'backend',
key: caller,
text: text,
user: userName,
value4: ''
},
scope: this
});
}
if (me.displayBrowserNotification()) {
new Notification(title, this.getNotificationOptions(text));
return;
}
if (me.growlDisplayBottom) {
compTop = me.offsetBottom;
}
msgData = {
title: title || false,
text: text,
iconCls: iconCls || 'growl'
};
me.growlMsgCollection.each(function(growlEl) {
compTop += growlEl.height + 6;
});
growlMsg = Ext.create('Ext.panel.Panel', {
ui: [ 'default', 'shopware-ui' ],
data: msgData,
id: id,
unstyled: true,
cls: me.growlMsgCls,
tpl: me.growlMsgTpl,
renderTo: Ext.getBody()
});
growlMsg.update(msgData);
style = me.createGrowlStyle(growlMsg.getWidth(), growlMsg.getHeight(), compTop);
growlMsg.getEl().setStyle(style);
var task = new Ext.util.DelayedTask(function() {
me.closeGrowlMessage(growlMsg, me, task);
});
task.delay(this.hideDelay + (text.length * 35));
me.growlMsgCollection.add(id, { el: growlMsg, height: growlMsg.getHeight(), sticky: false });
return growlMsg;
},
getNotificationOptions: function (text) {
return {
icon: 'https://www.indisplay.com/stageware12/themes/Frontend/Responsive/frontend/_public/src/img/favicon.ico',
body: text
};
},
createStickyGrowlMessage: function(opts, caller, iconCls, log) {
var me = this, msgData, growlMsg, growlContent, btnContent, closeCB, detailCB, autoClose, closeHandler,
target = '_blank', width = 300, id = Ext.id(), compTop = me.offsetTop, style;
if (me.growlDisplayBottom) {
compTop = me.offsetBottom;
}
log = log || false;
target = (opts.btnDetail && opts.btnDetail.target) ? opts.btnDetail.target : target;
width = opts.width || width;
closeCB = opts.callback || Ext.emptyFn;
detailCB = (opts.btnDetail && opts.btnDetail.callback) ? opts.btnDetail.callback : Ext.emptyFn;
autoClose = (opts.btnDetail && opts.btnDetail.autoClose !== undefined) ? opts.btnDetail.autoClose : true;
if (log !== false || opts.log !== false) {
Ext.Ajax.request({
url: '/stageware12/backend/Logger/createLog',
params: {
type: 'backend',
key: caller,
text: opts.text,
user: userName,
value4: ''
},
scope: this
});
}
msgData = {
title: opts.title || false,
text: opts.text,
iconCls: iconCls || 'growl'
};
btnContent = Ext.create('Ext.container.Container', {
cls: me.growlMsgCls + '-btn-content',
flex: 2,
layout: {
type: 'vbox',
align: 'stretch',
pack: 'center'
}
});
growlContent = Ext.create('Ext.container.Container', {
data: msgData,
cls: me.growlMsgCls + '-sticky-content',
tpl: me.growlMsgTpl,
maxHeight: 120,
autoScroll: true,
flex: 3
});
growlContent.update(msgData);
growlMsg = Ext.create('Ext.panel.Panel', {
unstyled: true,
id: id,
width: width,
ui: [ 'default', 'shopware-ui' ],
layout: {
type: 'hbox',
align: 'stretch'
},
cls: me.growlMsgCls + ' ' + me.growlMsgCls + '-sticky-notification',
renderTo: document.body,
items: [ growlContent, btnContent ]
});
closeHandler = function() {
me.closeGrowlMessage(growlMsg, me);
closeCB.apply(opts.scope || me, [ growlMsg, msgData ]);
};
if (opts.btnDetail && (opts.btnDetail.link || opts.btnDetail.callback)) {
btnContent.add({
xtype: 'button',
height: 22,
ui: 'growl-sticky',
text: opts.btnDetail.text || 'Details aufrufen',
handler: function() {
if (opts.btnDetail.link) {
window.open(opts.btnDetail.link, target);
}
detailCB.apply(opts.btnDetail.scope || me, [ growlMsg, msgData ]);
if (autoClose) {
closeHandler();
}
}
});
}
btnContent.add({
xtype: 'button',
ui: 'growl-sticky',
text: me.closeText,
height: 22,
handler: function() {
closeHandler();
if (Ext.isFunction(opts.onCloseButton)) {
opts.onCloseButton();
}
}
});
me.growlMsgCollection.each(function(growlEl) {
compTop += growlEl.height + 6;
});
style = me.createGrowlStyle(width, growlMsg.getHeight(), compTop);
growlMsg.getEl().setStyle(style);
me.growlMsgCollection.add(id, { el: growlMsg, height: growlContent.getHeight() + 26, sticky: true });
return growlMsg;
},
closeGrowlMessage: function(msg, scope, task) {
var pos = -1;
if (task && Ext.isObject(task)) {
task.cancel();
}
msg.getEl().setStyle('opacity', 0);
Ext.defer(function() {
msg.destroy();
scope.growlMsgCollection.removeAtKey(msg.id);
}, 210);
scope.growlMsgCollection.each(function(growlMsg, i) {
if (growlMsg.el.id === msg.id) {
pos = i;
}
if (pos > -1 && pos !== i) {
var top = scope.growlMsgCollection.getAt(pos).height;
if (scope.growlDisplayBottom) {
top = top - (scope.growlMsgCollection.items.length - 2) * 6;
growlMsg.el.animate({
to: { top: growlMsg.el.getPosition()[1] + (top < 50 ? 50 : top) + 'px' }
}, 50);
} else {
top = top + (scope.growlMsgCollection.items.length - 2) * 6;
growlMsg.el.animate({
to: { top: growlMsg.el.getPosition()[1] - (top < 50 ? 50 : top) + 'px' }
}, 50);
}
}
});
return true;
},
displayBrowserNotification: function () {
return !(window.document.hasFocus()
|| !('Notification' in window)
|| Notification.permission === 'denied'
|| document.location.protocol !== 'https:');
}
});
Ext.define('Shopware.form.PasswordStrengthMeter', {
extend: 'Ext.form.field.Text',
alias: 'widget.passwordmeter',
inputType: 'password',
reset: function() {
this.callParent();
this.updateMeter();
},
fieldSubTpl: [
'<div><input id="{id}" type="{type}" ',
'<tpl if="name">name="{name}" </tpl>',
'<tpl if="size">size="{size}" </tpl>',
'<tpl if="tabIdx">tabIndex="{tabIdx}" </tpl>',
'class="{fieldCls} {typeCls}" autocomplete="off" /></div>',
'<div class="' + Ext.baseCSSPrefix + 'form-strengthmeter">',
'<div class="' + Ext.baseCSSPrefix + 'form-strengthmeter-scorebar">&nbsp;</div>',
'</div>',
{
compiled: true,
disableFormats: true
}
],
onChange: function(newValue, oldValue) {
this.updateMeter(newValue);
},
updateMeter: function(val) {
var me = this, maxWidth, score, scoreWidth,
objMeter = me.el.down('.' + Ext.baseCSSPrefix + 'form-strengthmeter'),
scoreBar = me.el.down('.' + Ext.baseCSSPrefix + 'form-strengthmeter-scorebar');
if (val){
maxWidth = objMeter.getWidth();
score = me.calcStrength(val);
scoreWidth = maxWidth - (maxWidth / 100) * score;
scoreBar.setWidth(scoreWidth, true);
} else {
scoreBar.setWidth('100%');
}
},
calcStrength: function(p) {
var len = p.length,
score = len;
if (len > 0 && len <= 4) { // length 4 or
score += len
} else if (len >= 5 && len <= 7) {
score += 6;
} else if (len >= 8 && len <= 15) {
score += 12;
} else if (len >= 16) { // length 16 or more
score += 18;
}
if (p.match(/[a-z]/)) {
score += 1;
}
if (p.match(/[A-Z]/)) { // [verified] at least one upper
score += 5;
}
if (p.match(/\d/)) { // [verified] at least one
score += 5;
}
if (p.match(/(?:.*?\d)3/)) {
score += 5;
}
if (p.match(/[\!,@,#,$,%,\^,&,\*,\?,_,~]/)) {
score += 5;
}
if (p.match(/(?:.*?[\!,@,#,$,%,\^,&,\*,\?,_,~])2/)) {
score += 5;
}
if (p.match(/(?=.*[a-z])(?=.*[A-Z])/)) {
score += 2;
}
if (p.match(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/)) {
score += 2;
}
if (p.match(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\!,@,#,$,%,\^,&,\*,\?,_,~])/)) {
score += 2;
}
return Math.min(Math.round(score * 2), 100);
}
});
Ext.define('Shopware.form.field.AceEditor', {
extend: 'Ext.form.field.TextArea',
alias: ['widget.ace-editor', 'widget.codemirrorfield', 'widget.codemirror'],
layout: 'fit',
border: false,
fontSize: '12px',
theme: 'clouds',
printMargin: false,
printMarginColumn: 80,
highlightActiveLine: true,
highlightGutterLine: true,
highlightSelectedWord: true,
showGutter: true,
fullLineSelection: true,
tabSize: 4,
useSoftTabs: false,
showInvisible: false,
useWrapMode: true,
codeFolding: true,
height: 200,
useWorker: true,
alternateClassName: [ 'Shopware.form.field.CodeMirror', 'Shopware.form.CodeMirror', 'Ext.form.field.CodeMirror' ],
isEditorRendered: false,
fieldSubTpl: [
'<pre id="{id}"',
'</pre>',
{
disableFormats: true
}
],
listeners: {
resize: function () {
if (this.editor) {
this.fixAutocompleteWidth();
this.editor.resize();
}
},
activate: function () {
if (this.editor) {
this.editor.focus();
}
}
},
constructor: function(config) {
this.config = config;
return this.callParent(arguments);
},
onRender: function () {
var me = this;
me.callParent(arguments);
if (!me.isEditorRendered) {
me.initEditor();
}
},
initEditor: function () {
var me = this,
currentModeName = Ext.isObject(me.config.mode) ? me.config.mode.name : me.config.mode;
if (!Ext.isDefined(currentModeName)) {
currentModeName = 'html';
}
me.editor = ace.edit(me.inputId);
me.editor.ownerCt = me;
me.getSession().setMode('ace/mode/' + currentModeName);
me.fireEvent('setAceEditorMode', me, currentModeName);
me.editor.getSession().setUseWorker(me.useWorker);
me.editor.setTheme('ace/theme/' + me.theme);
me.editor.getSession().setUseWrapMode(me.useWrapMode);
me.editor.setShowFoldWidgets(me.codeFolding);
me.editor.setShowInvisibles(me.showInvisible);
me.editor.setHighlightGutterLine(me.highlightGutterLine);
me.editor.setHighlightSelectedWord(me.highlightSelectedWord);
me.editor.renderer.setShowGutter(me.showGutter);
me.editor.setShowPrintMargin(me.printMargin);
me.editor.setPrintMarginColumn(me.printMarginColumn);
me.editor.setHighlightActiveLine(me.highlightActiveLine);
me.editor.setReadOnly(me.isDisabled() || me.readOnly);
me.getSession().setTabSize(me.tabSize);
me.getSession().setUseSoftTabs(me.useSoftTabs);
me.setValue(me.rawValue);
me.editor.completers = [];
if (me.config.completers) {
me.editor.completers = me.config.completers;
}
me.editor.setOptions({
enableBasicAutocompletion: true,
enableSnippets: true,
enableLiveAutocompletion: true
});
me.editor.refresh = function() {
me.editor.renderer.updateFull();
};
me.editor.getSession().on('change', function () {
me.setRawValue(me.getSession().getValue());
me.fireEvent('change', me);
}, me);
me.editor.resize();
if (!me.editor.completer && !me.editor.getReadOnly()) {
me.editor.execCommand("startAutocomplete");
me.editor.completer.detach()
}
me.isEditorRendered = true;
me.fireEvent('editorcreated', me);
},
enable: function() {
if (this.editor) {
this.editor.setReadOnly(false);
}
return this.callParent(arguments);
},
disable: function() {
if (this.editor) {
this.editor.setReadOnly(true);
}
return this.callParent(arguments);
},
getSession: function () {
return this.editor.getSession();
},
reset: function() {
if (this.editor) {
this.editor.setValue('');
}
this.callParent(arguments);
},
getValue: function() {
if (this.editor) {
this.getSession().getValue();
}
return this.callParent(arguments);
},
setValue: function(value) {
if (this.editor && (typeof value !== "undefined") && value !== null) {
this.editor.setValue(value, -1);
}
this.config.value = value;
return this.callParent(arguments);
},
focus: function() {
this.editor.focus();
},
fixAutocompleteWidth: function() {
if (this.editor.getReadOnly()) {
return;
}
this.editor.completer.getPopup().container.style.width = (this.getWidth() - 80) + 'px';
this.editor.completer.getPopup().resize();
},
setReadOnly: function(value) {
if (this.editor) {
this.editor.setReadOnly(value);
}
this.callParent(arguments);
},
setDisabled: function(value) {
if (this.editor) {
this.editor.setReadOnly(value);
}
this.callParent(arguments);
},
destroy: function () {
if (this.editor) {
this.editor.destroy();
}
this.callParent(arguments);
}
});
Ext.define('Shopware.form.field.ArticleSearch',
{
extend: 'Ext.container.Container',
layout: 'anchor',
alternateClassName: [ 'Shopware.form.ArticleSearch', 'Shopware.ArticleSearch', 'Shopware.form.field.ProductSearch' ],
alias: [ 'widget.articlesearch', 'widget.articlesearchfield', 'widget.productsearchfield' ],
cls: Ext.baseCSSPrefix + 'search-article-live',
requires: [
'Ext.form.field.Trigger',
'Ext.view.View',
'Ext.form.field.Hidden',
'Ext.XTemplate',
'Shopware.apps.Base.store.Article',
'Shopware.apps.Base.model.Article',
'Ext.grid.Panel'
],
returnValue: 'name',
hiddenReturnValue: 'number',
returnRecord: null,
searchFieldName: 'live-article-search',
hiddenFieldName: 'hidden-article-search',
dropDownStore: null,
store: null,
dropDownOffset: [ 105, 8 ],
searchBuffer: 500,
multiSelect: false,
multiSelectStore: Ext.create('Ext.data.Store', {
model: 'Shopware.apps.Base.model.Article'
}),
mulitSelectGrid: null,
gridHeight: 200,
gridToolbarDock: 'bottom',
confirmButtonText: 'Zugewiesene Artikel speichern',
cancelButtonText: 'Artikel zurücksetzen',
separator: ';',
searchScope: ['articles','variants','configurator'],
formFieldConfig: {},
emptyText: 'Suche...',
snippets: {
assignedArticles: 'Zugewiesene Artikel',
articleName: 'Artikelname',
orderNumber: 'Bestellnummer',
dropDownTitle: 'Artikel'
},
initComponent: function() {
var me = this;
me.registerEvents();
if (!(me.store instanceof Ext.data.Store)) {
if (!(me.articleStore instanceof Ext.data.Store)) {
me.store = Ext.create('Shopware.apps.Base.store.Article');
} else {
me.store = me.articleStore;
}
}
var dropDownStoreName = me.store.$className;
me.dropDownStore = Ext.create(dropDownStoreName, {
listeners: {
single: true,
load: function() {
me.loadArticleStore(me.store);
}
}
});
if (Ext.isObject(me.store) && me.store.data.items.length > 0 ) {
me.loadArticleStore(me.store);
}
if (Ext.isArray(me.searchScope) && me.searchScope.length > 0) {
me.dropDownStore.getProxy().extraParams = {
articles: Ext.Array.contains(me.searchScope, 'articles'),
variants: Ext.Array.contains(me.searchScope, 'variants'),
configurator: Ext.Array.contains(me.searchScope, 'configurator')
};
}
me.hiddenField = me.createHiddenField();
me.searchField = me.createSearchField();
me.dropDownMenu = me.createDropDownMenu();
me.items = [ me.hiddenField, me.searchField, me.dropDownMenu ];
if(!me.multiSelect) {
delete me.multiSelectStore;
} else {
me.multiSelectGrid = me.createMultiSelectGrid();
me.items.push(me.multiSelectGrid);
}
if(me.articleStore && me.multiSelect) {
me.multiSelectGrid.show();
}
me.dropDownStore.on('datachanged', me.onSearchFinish, me);
me.callParent(arguments);
},
registerEvents: function() {
this.addEvents(
'reset',
'search',
'valueselect',
'deleteArticle',
'applyAssignment'
);
},
createHiddenField: function() {
var me = this,
input = Ext.create('Ext.form.field.Hidden', {
name: me.hiddenFieldName
});
return input;
},
getHiddenField: function() {
return this.hiddenField || (this.hiddenField = this.createHiddenField());
},
createSearchField: function() {
var me = this;
var fieldConfig = Ext.apply({
componentLayout: 'textfield',
triggerCls: 'reset',
emptyText: me.emptyText,
fieldLabel: (me.fieldLabel || undefined),
cls: Ext.baseCSSPrefix + 'search-article-live-field',
name: me.searchFieldName,
enableKeyEvents: true,
anchor: (me.anchor || undefined),
onTriggerClick: function() {
this.reset();
this.focus();
this.setHideTrigger(true);
me.dropDownMenu.hide();
me.fireEvent('reset', me, this);
},
hideTrigger: true,
listeners: {
scope: me,
keyup: me.onSearchKeyUp,
blur: me.onSearchBlur
}
}, me.formFieldConfig);
var input = Ext.create('Ext.form.field.Trigger', fieldConfig);
return input;
},
onSearchBlur: function() {
var me = this;
Ext.defer(function() {
if (me.dropDownMenu) {
me.dropDownMenu.hide();
}
}, 1000);
},
getSearchField: function() {
return this.searchField || (this.searchField = this.createSearchField())
},
createDropDownMenu: function() {
var me = this,
view = Ext.create('Ext.view.View', {
floating: true,
autoShow: false,
autoRender: true,
hidden: true,
shadow: false,
width: 222,
toFrontOnShow: true,
focusOnToFront: false,
store: me.dropDownStore,
cls: Ext.baseCSSPrefix + 'search-article-live-drop-down',
overItemCls: Ext.baseCSSPrefix + 'drop-down-over',
selectedItemCls: Ext.baseCSSPrefix + 'drop-down-over',
trackOver: true,
itemSelector: 'div.item',
singleSelect: true,
listeners: {
scope: me,
itemclick: function(view, record) {
me.onSelectArticle(view, record);
}
},
tpl: me.createDropDownMenuTpl()
});
return view;
},
getDropDownMenu: function() {
return this.dropDownMenu || (this.dropDownMenu = this.createDropDownMenu());
},
createDropDownMenuTpl: function() {
var me = this;
return new Ext.XTemplate(
'<div class="header">',
'<div class="header-inner">',
'<div class="arrow">&nbsp;</div>',
'<span class="title">',
me.snippets.dropDownTitle,
'</span>',
'</div>',
'</div>',
'<div class="content">',
'<tpl for=".">',
'<div class="item">',
'<strong class="name">{name}</strong>',
'<span class="ordernumber">{number}</span>',
'</div>',
'</tpl>',
'</div>'
);
},
createMultiSelectGrid: function() {
var me = this, grid;
me.multiSelectToolbar = me.createMultiSelectGridToolbar();
var grid = Ext.create('Ext.grid.Panel', {
store: me.multiSelectStore,
title: me.snippets.assignedArticles,
selModel: 'rowmodel',
autoScroll: true,
columns: me.createMultiSelectGridColumns(),
hidden: (me.multiSelectStore.getCount() ? false : true),
anchor: (me.anchor || undefined),
height: me.gridHeight,
dockedItems: [ me.multiSelectToolbar ]
});
return grid;
},
getMultiSelectGrid: function() {
return this.multiSelectGrid || (this.multiSelectGrid = this.createMultiSelectGrid());
},
createMultiSelectGridColumns: function() {
var me = this;
return [{
header: me.snippets.articleName,
dataIndex: me.returnValue,
flex: 2
}, {
header: me.snippets.orderNumber,
dataIndex: me.hiddenReturnValue,
flex: 1
}, {
xtype: 'actioncolumn',
width: 30,
items: [{
iconCls: 'sprite-minus-circle',
handler: function(grid, rowIndex) {
me.onDeleteArticle(rowIndex);
}
}]
}];
},
createMultiSelectGridToolbar: function() {
var me = this, toolbar;
toolbar = Ext.create('Ext.toolbar.Toolbar', {
dock: me.gridToolbarDock,
ui: 'shopware-ui',
items: ['->', {
text: me.cancelButtonText,
handler: function() {
me.getMultiSelectGrid().hide();
me.multiSelectStore.removeAll();
}
}, {
text: me.confirmButtonText,
handler: function() {
me.getMultiSelectValues();
}
}]
});
return toolbar;
},
getMultiSelectGridToolbar: function() {
return this.multiSelectToolbar || (this.multiSelectToolbar = this.createMultiSelectGridToolbar());
},
onSearchKeyUp: function(el, event) {
var me = this;
el.setHideTrigger(el.getValue().length === 0);
clearTimeout(me.searchTimeout);
if(event.keyCode === Ext.EventObject.ESC || !el.value) {
event.preventDefault();
el.setValue('');
me.dropDownStore.filters.clear();
me.getDropDownMenu().hide();
return false;
}
var dropdown = me.getDropDownMenu(),
selModel = dropdown.getSelectionModel(),
record = selModel.getLastSelected(),
curIndex = me.dropDownStore.indexOf(record),
lastIndex = me.dropDownStore.getCount() - 1;
if(event.keyCode === Ext.EventObject.UP) {
if(curIndex === undefined) {
selModel.select(0);
} else {
selModel.select(curIndex === 0 ? lastIndex : (curIndex - 1));
}
}
else if(event.keyCode === Ext.EventObject.DOWN) {
if(curIndex == undefined) {
selModel.select(0);
} else {
selModel.select(curIndex === lastIndex ? 0 : (curIndex + 1));
}
}
else if(event.keyCode === Ext.EventObject.ENTER) {
event.preventDefault();
record && me.onSelectArticle(null, record);
}
else {
me.searchTimeout = setTimeout(function() {
me.dropDownStore.filters.clear();
me.dropDownStore.filter('free', '%' + el.value + '%');
}, me.searchBuffer);
}
},
onSearchFinish: function(store) {
var records = store.data.items,
me = this;
if(records.length === 0) {
me.getDropDownMenu().hide();
} else {
me.fireEvent('search', me, records);
me.getDropDownMenu().show();
me.getDropDownMenu().alignTo(me.getSearchField().getEl(), 'bl', me.dropDownOffset);
me.getDropDownMenu().getSelectionModel().select(0);
}
},
onSelectArticle: function(view, record) {
var me = this;
if(!me.multiSelect) {
me.getSearchField().setValue(record.get(me.returnValue));
me.getHiddenField().setValue(record.get(me.hiddenReturnValue));
me.returnRecord = record;
me.getDropDownMenu().hide();
} else {
if(me.getMultiSelectGrid().isHidden()) {
me.getMultiSelectGrid().show();
}
delete record.internalId;
me.multiSelectStore.add(record);
me.getDropDownMenu().getSelectionModel().deselectAll();
}
me.fireEvent('valueselect', me, record.get(me.returnValue), record.get(me.hiddenReturnValue), record);
},
onDeleteArticle: function(rowIndex, silent) {
var me = this,
grid = me.getMultiSelectGrid(),
store = me.multiSelectStore,
record = store.getAt(rowIndex);
silent = silent || false;
store.remove(record);
if(!store.getCount()) {
grid.hide();
}
if(!silent) {
me.fireEvent('deleteArticle', me, record, store, grid);
}
},
getMultiSelectValues: function() {
var me = this,
store = me.multiSelectStore,
records = store.data.items,
returnValue = '',
hiddenReturnValue = '';
Ext.each(records, function(record) {
returnValue += record.get(me.returnValue) + me.separator;
hiddenReturnValue += record.get(me.hiddenReturnValue) + me.separator;
});
returnValue = returnValue.substring(0, returnValue.length - 1);
hiddenReturnValue = hiddenReturnValue.substring(0, hiddenReturnValue.length - 1);
me.fireEvent('applyAssignment', me, returnValue, hiddenReturnValue, records, store);
},
destroy: function() {
Ext.destroyMembers(this,  'mulitSelectGrid',  'hiddenField', 'searchField', 'dropDownMenu', 'multiSelectToolbar');
},
loadArticleStore: function(store) {
var me = this;
Ext.each(store.data.items, function(record) {
delete record.internalId;
me.multiSelectStore.add(record);
});
return true;
},
getArticleStore: function() {
return this.multiSelectStore
},
reset: function () {
this.searchField.reset();
}
});
Ext.define('Shopware.form.field.PagingComboBox',
{
extend: 'Ext.form.field.ComboBox',
alias: ['widget.pagingcombobox', 'widget.pagingcombo'],
pagingBarConfig: {
first: true,
prev: true,
jumpTo: false,
next: true,
last: true,
refresh: true
},
defaultPageSize: 15,
forceDefaultPageSize: false,
disableLoadingSelectedName: false,
initComponent: function () {
var me = this;
me.callParent(arguments);
if (!me.disableLoadingSelectedName) {
me.on('change', me.templateComboBoxChanged);
}
},
templateComboBoxChanged: function(combo, newValue) {
var store = combo.getStore();
if (!newValue) {
return;
}
this.un('change', this.templateComboBoxChanged);
store.getProxy().setExtraParam(combo.valueField, newValue);
store.currentPage = 1;
store.load({
callback: function (responseData, operation, success) {
if (!success) {
return;
}
if (responseData.length > 1) {
throw new Error('The PHP controller returned more than one entry. Your controller needs to be able to handle requests for just a single entry.');
}
this.getProxy().extraParams = [];
this.load();
}
});
},
getDisplayValue: function () {
if (!Ext.isDefined(this.displayTplData) || this.displayTplData === null) {
return this.callParent(arguments);
}
if (!this.displayTplData.length) {
return this.emptyText;
}
if (!this.isValidRecordData(this.displayTplData[0])) {
return this.getRawValue();
}
return this.callParent(arguments);
},
isValidRecordData: function (displayData) {
var objectKeys = Object.keys(displayData),
objectLen = objectKeys.length;
return !(objectLen === 1 && objectKeys[0] === this.displayField);
},
createPicker: function() {
var pagingComboBox = this,
me = pagingComboBox;
if(me.store.pageSize && !me.forceDefaultPageSize) {
me.pageSize = me.store.pageSize;
} else {
me.pageSize = me.defaultPageSize;
}
var picker,
menuCls = Ext.baseCSSPrefix + 'menu',
pickerCfg = Ext.apply({
xtype: 'boundlist',
pickerField: me,
selModel: {
mode: me.multiSelect ? 'SIMPLE' : 'SINGLE'
},
floating: true,
hidden: true,
ownerCt: me.up('[floating]'),
cls: me.el && me.el.up('.' + menuCls) ? menuCls : '',
store: me.store,
displayField: me.displayField,
focusOnToFront: false,
pageSize: me.pageSize,
tpl: me.tpl,
createPagingToolbar: function() {
return Ext.widget('pagingtoolbar', {
id: this.id + '-paging-toolbar',
pageSize: this.pageSize,
store: this.store,
border: false,
getPagingItems: function() {
var me = this, pageText;
var pagingBarItems = [{
itemId: 'first',
tooltip: me.firstText,
hidden: !pagingComboBox.pagingBarConfig.first,
overflowText: me.firstText,
iconCls: Ext.baseCSSPrefix + 'tbar-page-first',
disabled: true,
handler: me.moveFirst,
scope: me
},{
itemId: 'prev',
hidden: !pagingComboBox.pagingBarConfig.prev,
tooltip: me.prevText,
overflowText: me.prevText,
iconCls: Ext.baseCSSPrefix + 'tbar-page-prev',
disabled: true,
handler: me.movePrevious,
scope: me
},
{
xtype: 'numberfield',
itemId: 'inputItem',
name: 'inputItem',
hidden: !pagingComboBox.pagingBarConfig.jumpTo,
cls: Ext.baseCSSPrefix + 'tbar-page-number',
allowDecimals: false,
minValue: 1,
hideTrigger: true,
enableKeyEvents: true,
keyNavEnabled: false,
selectOnFocus: true,
submitValue: false,
isFormField: false,
width: me.inputItemWidth,
margins: '-1 2 3 2',
listeners: {
scope: me,
keydown: me.onPagingKeyDown,
blur: me.onPagingBlur
}
},{
xtype: 'tbtext',
itemId: 'afterTextItem',
hidden: !pagingComboBox.pagingBarConfig.jumpTo,
text: Ext.String.format(me.afterPageText, 1)
},
'-',
{
itemId: 'next',
tooltip: me.nextText,
overflowText: me.nextText,
iconCls: Ext.baseCSSPrefix + 'tbar-page-next',
disabled: true,
hidden: !pagingComboBox.pagingBarConfig.next,
handler: me.moveNext,
scope: me
},{
itemId: 'last',
tooltip: me.lastText,
overflowText: me.lastText,
iconCls: Ext.baseCSSPrefix + 'tbar-page-last',
disabled: true,
handler: me.moveLast,
hidden: !pagingComboBox.pagingBarConfig.last,
scope: me
},
'-',
{
itemId: 'refresh',
tooltip: me.refreshText,
hidden: !pagingComboBox.pagingBarConfig.refresh,
overflowText: me.refreshText,
iconCls: Ext.baseCSSPrefix + 'tbar-loading',
handler: me.doRefresh,
scope: me
}];
if (pagingComboBox.pagingBarConfig.jumpTo) {
Ext.Array.insert(pagingBarItems, 2, ['-', me.beforePageText]);
}
return pagingBarItems;
}
});
}
}, me.listConfig, me.defaultListConfig);
picker = me.picker = Ext.widget(pickerCfg);
if (me.pageSize) {
picker.pagingToolbar.on('beforechange', me.onPageChange, me);
}
me.mon(picker, {
itemclick: me.onItemClick,
refresh: me.onListRefresh,
scope: me
});
me.mon(picker.getSelectionModel(), {
beforeselect: me.onBeforeSelect,
beforedeselect: me.onBeforeDeselect,
selectionchange: me.onListSelectionChange,
scope: me
});
return picker;
}
});
Ext.define('Shopware.container.Viewport',
{
extend: 'Ext.container.Viewport',
alias: 'widget.sw4viewport',
requires: [
'Ext.EventManager',
'Ext.util.MixedCollection'
],
alternateClassName: 'Shopware.Viewport',
isViewport: true,
ariaRole: 'application',
cssBaseCls: Ext.baseCSSPrefix + 'viewport',
desktops: Ext.create('Ext.util.MixedCollection'),
activeDesktop: null,
scrollable: true,
scrollDuration: 500,
scrollEasing: 'ease',
desktopComponentName: 'Ext.container.Container',
defaultDesktopNames: [
'Dashboard'
],
stateful: true,
stateId: 'sw4-viewport',
afterRender: function() {
var me = this;
var appCls = Ext.ClassManager.get('Shopware.app.Application');
appCls.baseComponentIsReady(me);
me.callParent(arguments);
},
initComponent: function() {
var me = this,
html = Ext.fly(document.body.parentNode),
el;
me.registerEvents();
me.callParent(arguments);
el = Ext.getBody();
el.setHeight = Ext.emptyFn;
el.dom.scroll = 'no';
el.dom.scrollWidth = Ext.Element.getViewportWidth();
html.dom.scroll = 'no';
html.dom.scrollWidth = Ext.Element.getViewportWidth();
html.scrollLeft = 0;
me.allowDomMove = false;
Ext.EventManager.onWindowResize(me.fireResize, me);
me.renderTo = el;
Ext.suspendLayouts();
html.addCls(me.cssBaseCls);
html.setStyle('position', 'relative');
html.setStyle('left', '0px');
html.setStyle('overflow', 'hidden');
el.setStyle('left', '0px');
el.setStyle('overflow', 'hidden');
Ext.resumeLayouts(true);
me.el = el;
me.createDefaultDesktops();
me.resizeViewport();
me.createHiddenLayer();
},
createHiddenLayer: function() {
var me = this;
me.hiddenLayer = new Ext.dom.Element(document.createElement('div'));
me.hiddenLayer.set({
'class': Ext.baseCSSPrefix + 'hidden-layer',
style: {
position: 'fixed',
top: 0,
left: 0,
width: Ext.Element.getViewportWidth() + 'px',
height: Ext.Element.getViewportHeight() + 'px'
}
});
},
getHiddenLayer: function() {
var me = this;
if(!me.hiddenLayer) {
me.createHiddenLayer();
}
return me.hiddenLayer;
},
registerEvents: function() {
this.addEvents(
'createdesktop',
'changedesktop',
'removedesktop',
'resizeviewport',
'beforescroll',
'afterscroll'
);
},
fireResize: function(w, h) {
var me = this;
me.el.setSize(w * (me.getDesktopCount() || 1), h);
me.setSize(w * (me.getDesktopCount() || 1), h);
Ext.each(this.desktops.items, function(desktop) {
desktop.setSize(w, h - 80);
});
Ext.defer(me._rearrangeVisibleWindows, 5, this);
},
_rearrangeVisibleWindows: function() {
var activeWindows = Shopware.app.Application.getActiveWindows();
Ext.each(activeWindows, function(win) {
if(win.hidden) {
return;
}
var position = win.getPosition(),
size = win.getSize();
win.center();
win.setPosition(position[0], (win.maximized) ? 0 : 15, false);
if(win.maximized) {
size.height -= 50;
win.setSize(size);
}
});
},
resizeViewport: function() {
var me = this,
size = me.getViewportSize(),
width = size[0],
height = size[1];
me.el.setSize(width, height);
me.fireEvent('resizeviewport', me, width, height);
return size;
},
getViewportSize: function() {
var me = this,
width = Ext.Element.getViewportWidth() * (me.getDesktopCount() || 1),
height = Ext.Element.getViewportHeight();
return [ width, height ];
},
createDefaultDesktops: function() {
var me = this;
me.activeDesktop = 0;
Ext.suspendLayouts();
me.createDesktop(me.defaultDesktopNames[me.activeDesktop]);
Ext.resumeLayouts(true);
},
getDesktop: function(index) {
return this.desktops.getAt(index);
},
getDesktopPosition: function(desktop) {
return this.desktops.indexOf(desktop);
},
getDesktopCount: function() {
return this.desktops.getCount();
},
createDesktop: function(title) {
var me = this,
desktop = Ext.create(me.desktopComponentName, {
renderTo: me.getEl(),
region: 'center',
x: 0,
y: 40,
width: Ext.Element.getViewportWidth(),
height: Ext.Element.getViewportHeight() - 80,
layout: 'fit',
title: title,
floating: true,
style: 'z-index: 10',
cls: 'desktop-pnl'
});
me.desktops.add(desktop);
me.fireEvent('createdesktop', me, desktop);
me.resizeViewport();
return desktop;
},
removeDesktop: function(desktop) {
var me = this, removedDesktop;
if(Ext.isNumeric(desktop)) {
removedDesktop = me.getDesktop(desktop);
me.desktops.removeAt(desktop);
} else {
removedDesktop = desktop;
me.desktops.remove(desktop);
}
me.fireEvent('removedesktop', this, removedDesktop);
me.resizeViewport();
return desktop;
},
setActiveDesktop: function(index) {
var me = this,
newDesktop = me.getDesktop(index),
oldDesktopIndex = me.activeDesktop,
oldDesktop = me.getDesktop(me.activeDesktop);
me.activeDesktop = index;
me.fireEvent('changedesktop', me, index, newDesktop, oldDesktopIndex, oldDesktop);
return newDesktop;
},
getActiveDesktop: function() {
return this.desktops.getAt(this.getActiveDesktopPosition());
},
getActiveDesktopPosition: function() {
return this.activeDesktop;
},
scroll: function(direction) {
var me = this,
html = Ext.fly(document.body.parentNode),
width = Ext.Element.getViewportWidth(),
pos = me.getActiveDesktopPosition();
if(direction === 'left' && pos - 1 > -1) {
pos -= 1;
} else if(direction === 'right' && me.getDesktopCount() > pos + 1) {
pos += 1;
} else {
return false;
}
html.animate({
duration: me.scrollDuration,
easing: me.scrollEasing,
listeners: {
beforeanimate: function() {
Ext.suspendLayouts();
me.fireEvent('beforescroll', me, this, pos);
},
afteranimate: function() {
Ext.resumeLayouts(true);
me.activeDesktop = pos;
me.fireEvent('afterscroll', me, this, pos);
}
},
to: { left: -(width * pos) }
});
return true;
},
jumpTo: function(index, noAnim) {
var me = this,
html = Ext.fly(document.body.parentNode),
width = Ext.Element.getViewportWidth(),
maxPos = me.getDesktopCount();
if(noAnim) {
html.setStyle('left', -(width * index));
me.activeDesktop = index;
me.fireEvent('afterscroll', me, this, index);
return true;
}
if(index < 0 && index < maxPos) {
return false;
}
var activeWindows = Shopware.app.Application.getActiveWindows();
html.animate({
duration: me.scrollDuration,
easing: me.scrollEasing,
listeners: {
beforeanimate: function() {
Ext.suspendLayouts();
me.fireEvent('beforescroll', me, this, index);
Ext.each(activeWindows, function(window) {
window.el.shadow.hide();
});
},
afteranimate: function() {
Ext.resumeLayouts(true);
me.activeDesktop = index;
me.fireEvent('afterscroll', me, this, index);
Ext.each(activeWindows, function(window) {
window.el.shadow.show(window.el);
});
}
},
to: { left: -(width * index) }
});
return true;
},
scrollLeft: function() {
return this.scroll('left');
},
scrollRight: function() {
return this.scroll('right');
}
});
Ext.define('Shopware.DragAndDropSelector',
{
extend: 'Ext.container.Container',
alias: [ 'widget.draganddropselector', 'widget.ddselector' ],
fromStore: null,
toStore: null,
fromField: null,
fromFieldDockedItems: null,
toField: null,
toFieldDockedItems: null,
selectedItems: null,
fromTitle: '',
toTitle: '',
fromColumns: [{
text: 'name',
flex: 1,
dataIndex: 'name'
}],
toColumns: [{
text: 'name',
flex: 1,
dataIndex: 'name'
}],
hideHeaders: true,
gridHeight: null,
showPagingToolbar: false,
layout: {
type: 'hbox',
align: 'stretch'
},
buttons: ['top', 'up', 'add', 'remove', 'down', 'bottom'],
buttonsText: {
top: "Move to Top",
up: "Move Up",
add: "Add to Selected",
remove: "Remove from Selected",
down: "Move Down",
bottom: "Move to Bottom"
},
initComponent: function() {
var me = this;
me.toStore = me.selectedItems;
me.refreshStore();
me.fromStore.load();
var config = {
title: me.fromTitle,
store: me.fromStore,
columns: me.fromColumns,
dockedItems: me.fromFieldDockedItems,
border: false,
viewConfig: {
plugins: {
ptype: 'gridviewdragdrop',
dragGroup: 'firstGridDDGroup',
dropGroup: 'secondGridDDGroup'
},
listeners: {
drop: function() {
me.refreshStore();
}
}
}
};
if (me.showPagingToolbar) {
config.bbar = Ext.create('Ext.toolbar.Paging', {
store: me.fromStore,
displayInfo: true
});
}
me.fromField = me.createGrid(config);
me.toField = me.createGrid({
title: me.toTitle,
store: me.toStore,
columns: me.toColumns,
dockedItems: me.toFieldDockedItems,
border: false,
viewConfig: {
plugins: {
ptype: 'gridviewdragdrop',
dragGroup: 'secondGridDDGroup',
dropGroup: 'firstGridDDGroup'
},
listeners: {
drop: function() {
me.refreshStore();
}
}
}
});
me.items = [
me.fromField,
me.getMiddleButtons(),
me.toField
];
me.callParent(arguments);
},
getMiddleButtons: function() {
var me = this;
return Ext.create('Ext.container.Container',{
margins: '0 4',
width: 22,
layout: {
type: 'vbox',
pack: 'center'
},
items: me.createButtons()
});
},
createButtons: function(){
var me = this,
buttons = [];
Ext.Array.forEach(me.buttons, function(name) {
var button = Ext.create('Ext.Button', {
tooltip: me.buttonsText[name],
cls: Ext.baseCSSPrefix + 'form-itemselector-btn',
iconCls: Ext.baseCSSPrefix + 'form-itemselector-' + name,
navBtn: true,
margin: '4 0 0 0'
});
button.addListener('click',  me['on' + Ext.String.capitalize(name) + 'BtnClick'], me);
buttons.push(button);
});
return buttons;
},
createGrid: function(config) {
var me = this;
var defaultConfig = {
stripeRows: true,
multiSelect: true,
hideHeaders: me.hideHeaders,
height: me.gridHeight,
flex: 1
};
defaultConfig = Ext.apply(defaultConfig, config);
var gridPanel = Ext.create('Ext.grid.Panel', defaultConfig);
gridPanel.addListener('itemdblclick',  me.onItemDblClick, me);
return gridPanel;
},
onItemDblClick: function(view, rec){
var me = this,
from = me.fromStore,
to = me.toStore,
current,
destination;
if (view.store === me.fromField.store) {
current = from;
destination = to;
} else {
current = to;
destination = from;
}
current.remove(rec);
destination.add(rec);
me.refreshStore();
},
onAddBtnClick: function() {
var me = this,
fromList = me.fromField,
selected = this.getSelections(fromList);
var storeItems = me.fromStore.data.items;
me.fromStore.removeAll();
storeItems = me.fastRemoveStoreItems(storeItems, selected);
me.fromStore.add(storeItems);
me.toStore.add(selected);
me.refreshStore();
},
onRemoveBtnClick: function() {
var me = this,
toList = me.toField,
selected = me.getSelections(toList);
var storeItems = me.toStore.data.items;
me.toStore.removeAll();
storeItems = me.fastRemoveStoreItems(storeItems, selected);
me.toStore.add(storeItems);
me.fromStore.add(selected);
me.refreshStore();
},
getSelections: function(list){
var store = list.getStore(),
selections = list.getSelectionModel().getSelection();
return Ext.Array.sort(selections, function(a, b){
a = store.indexOf(a);
b = store.indexOf(b);
if (a < b) {
return -1;
} else if (a > b) {
return 1;
}
return 0;
});
},
refreshStore: function() {
var me = this,
ids = [];
if(me.toStore != null) {
me.selectedItems = me.toStore;
}
if(me.selectedItems != null){
me.selectedItems.each(function(element) {
ids.push(element.get('id'));
});
}
me.fromStore.getProxy().extraParams = {
'usedIds[]': ids
};
},
fastRemoveStoreItems: function(storeItems, selected) {
var toRemove = [];
for(var i in storeItems) {
var select = storeItems[i];
Ext.each(selected, function(item) {
if(select.get('id') === item.get('id')) {
toRemove.unshift(i);
}
});
}
Ext.each(toRemove, function(index) {
Ext.Array.erase(storeItems, index, 1);
});
return storeItems;
},
destroy: function() {
this.fromStore = null;
Ext.destroyMembers(this, 'fromField', 'toField');
this.callParent();
}
});
Ext.define('Shopware.DataView.GooglePreview',
{
extend: 'Ext.container.Container',
alias: [ 'widget.googlepreview'],
cls: Ext.baseCSSPrefix + 'dataview-google-preview',
fieldSet: null,
fieldSetTitle: '',
titleField: null,
fallBackTitleField: null,
supportText: '',
refreshButtonText: 'Refresh',
layout: {
type: 'vbox'
},
initComponent: function() {
var me = this;
me.fieldSet = Ext.create('Ext.form.FieldSet', {
layout: 'anchor',
padding: 10,
width: '100%',
title: me.fieldSetTitle,
items: [ me.createPreviewView() ]
});
me.refreshButton = Ext.create('Ext.Button', {
text: me.refreshButtonText,
cls: 'primary',
scope: me,
handler: function () {
me.refreshView();
}
});
me.supportTextContainer = Ext.create('Ext.container.Container', {
style: 'font-style: italic; color: #999; font-size: x-small; margin: 0 0 8px 0;',
width: '100%',
html: me.supportText
});
me.items = [
me.fieldSet,
me.supportTextContainer,
me.refreshButton
];
me.callParent(arguments);
},
createPreviewView: function() {
var me = this;
me.previewView = Ext.create('Ext.view.View', {
itemSelector: '.preview',
name: 'google-preview-view',
tpl: me.createPreviewTemplate()
});
return me.previewView;
},
createPreviewTemplate: function() {
var me = this;
return new Ext.XTemplate(
'' +
'<tpl for=".">',
'<div class="preview">',
'<strong class="title">{title}</strong>',
'<span class="url">{url}</span>',
'<div class="desc">',
'<span class="date">{date}</span>',
'{metaDescription}',
'</div>',
'</div>',
'</tpl>',
''
);
},
getPreviewData: function() {
var me = this,
title = me.titleField.getValue() ? me.titleField.getValue() : me.fallBackTitleField.getValue(),
url = title,
metaDescription = me.descriptionField.getValue(),
date = '';
if(title != '') {
title = title.substr(0,50)+'...';
date = new Date().toLocaleDateString();
date = date+" - ";
}
if(url != '') {
url = "www.example.com/"+url;
url = url.substr(0,35)+'...';
url = url.toLowerCase();
url = url.replace(/\s/g, '-');
}
if(metaDescription != '') {
metaDescription = metaDescription.substr(0,70)+'...';
}
return {
title: title,
url: url,
date: date,
metaDescription: metaDescription
};
},
refreshView: function() {
var me = this;
me.previewView.update(me.getPreviewData());
},
destroy: function() {
Ext.destroyMembers(this);
this.callParent();
}
});
Ext.define('Shopware.form.field.ComboTree', {
extend: 'Ext.form.Picker',
alias: 'widget.combotree',
requires: [ 'Ext.tree.Panel' ],
matchFieldWidth: false,
initComponent: function() {
var me = this;
me.store.on({
scope: me,
load: me.onStoreHasLoaded
});
me.callParent(arguments)
},
createPicker: function () {
var me = this;
var treeConfig = Ext.apply({
floating: true,
hidden: true,
width: me.bodyEl.getWidth(),
store: me.store,
displayField: 'name',
useArrows: true,
rootVisible: false,
autoScroll: true,
queryMode: 'remote',
height: 300,
listeners: {
scope: me,
itemclick: me.onItemClick
},
flex: 1,
root: {
id: 1,
expanded: true
}
}, me.treeConfig);
me.treePanel = Ext.create('Ext.tree.Panel',treeConfig);
return me.treePanel;
},
onItemClick: function(view, record, item, index, e, eOpts){
this.setFieldValue(record.data.id, record.data.name);
this.fireEvent('select', this, record.data.name);
this.collapse();
},
afterRender: function() {
var me = this;
if(me.selectedRecord) {
var value = me.selectedRecord.get(me.treeField || me.displayField);
me.inputEl.dom.value = value;
me.setFieldValue(value);
}
me.callParent(arguments);
},
setFieldValue: function(value, label) {
var me = this;
if(!label) {
label = value;
}
me.setValue(value);
me.setRawValue(label);
},
setValue: function(value){
var me = this,
inputEl = me.inputEl;
if (inputEl && me.emptyText && !Ext.isEmpty(value)) {
inputEl.removeCls(me.emptyCls);
}
me.value = value;
        if (inputEl && !Ext.isEmpty(value)){
me.setRawValue(value); 
}  
me.applyEmptyText();
},
setRawValue: function(value){
this.inputEl.dom.value = value==null?"":value;
},
getValue: function(){
return this.value;
},
getRawValue: function(){
if(this.inputEl){
return this.inputEl.dom.value;
}
return 0;
},
onStoreHasLoaded: function(store) {
var me = this,
activeRecord;
if(me.value) {
activeRecord = store.getNodeById(me.value);
if(!activeRecord) {
return;
}
me.setRawValue(activeRecord.get(me.displayField));
}
},
getSubmitValue: function() {
var me = this;
if(!me.getRawValue()) {
return "";
}
return this.value;
},
destroy: function() {
this.callParent();
}
});
Ext.define('Shopware.window.plugin.Hud', {
windowCls: Ext.baseCSSPrefix + 'hub-pnl',
hudCls: Ext.baseCSSPrefix + 'hub-library',
hudTitle: 'Elemente-Bibliothek',
hudHeight: 325,
hudWidth: 225,
hudOffset: 10,
hudShow: true,
tpl: '<ul><tpl for="."><li class="drag-item">{name}</li></tpl></ul>',
itemSelector: '.x-library-element',
hudStoreErrorMessage: function(className) {
return className + ' needs the property "hudStore" which represents the store used by the hub panel to create the draggable items.';
},
constructor: function(config) {
Ext.apply(this, config);
},
init: function(view) {
var me = this;
me.ownerView = view;
me.ownerView.addCls(me.windowCls);
me.ownerView.on('show', me.setupLibraryWindow, me);
me.ownerView.hubPnl = me;
},
setupLibraryWindow: function() {
var me = this,
el = me.ownerView,
extEl = Ext.get(el.getEl().dom);
if(!me.hudStore || Ext.isEmpty(me.hudStore)) {
Ext.Error.raise(me.hudStoreErrorMessage(me.$className));
return false;
}
me.libraryView = Ext.create('Ext.view.View', {
tpl: me.tpl,
store: me.hudStore,
itemSelector: me.itemSelector,
overItemCls: Ext.baseCSSPrefix + 'item-over',
trackOver: true,
onItemSelect: function(record) {
var node = this._selectedNode; //this.getNode(record);
if (node) {
Ext.fly(node).addCls(this.selectedItemCls);
}
},
onItemDeselect: function(record) {
var node = this._deselectedNode; //this.getNode(record);
if (node) {
Ext.fly(node).removeCls(this.selectedItemCls);
}
},
processItemEvent: function(record, item, index, e) {
if (e.type == "mousedown" && e.button == 0) {
this._deselectedNode = this._selectedNode;
this._selectedNode = item;
}
},
updateIndexes: function(startIndex, endIndex) {
var ns = this.all.elements,
records = this.store.getRange(),
tmpRecords = [],
i, j;
Ext.each(records, function(item) {
var children = item.get('children');
Ext.each(children, function(child) {
tmpRecords.push(child);
});
});
records = tmpRecords;
startIndex = startIndex || 0;
endIndex = endIndex || ((endIndex === 0) ? 0 : (ns.length - 1));
for(i = startIndex, j = startIndex - 1; i <= endIndex; i++){
if (Ext.fly(ns[i]).is('.x-library-element')) {
j++;
}
ns[i].viewIndex = i;
ns[i].viewRecordId = records[j].internalId;
if (!ns[i].boundView) {
ns[i].boundView = this.id;
}
}
},
listeners: {
scope: me,
render: me.initializeDragZones,
afterrender: me.addAdditionalEvents
}
});
me.libraryPnl = Ext.create('Ext.panel.Panel', {
height: me.hudHeight,
unstyled: true,
preventHeader: true,
width: me.hudWidth,
cls: me.hudCls,
autoScroll: true,
style: 'position: absolute; top:0px; right: -' + (me.hudWidth + me.hudOffset) + 'px;',
renderTo: extEl,
items: [ me.libraryView ]
});
if(!me.hudShow) {
me.libraryPnl.hide();
}
extEl.setStyle('overflow', 'visible');
el.libraryPnl = me.libraryPnl;
},
initializeDragZones: function(view) {
var me = this, draggedElement;
view.dragZone = new Ext.dd.DragZone(view.getEl(), {
ddGroup: 'emotion-dd',
proxyCls: Ext.baseCSSPrefix + 'emotion-dd-proxy',
onDragStart: function() { },
getDragData: function(event) {
var source = event.getTarget(view.itemSelector, 10), d, element = Ext.get(source),
id, attr, i;
var proxy = view.dragZone.proxy;
if(!proxy.getEl().hasCls(Ext.baseCSSPrefix + 'shopware-dd-proxy')) {
proxy.getEl().addCls(Ext.baseCSSPrefix + 'shopware-dd-proxy')
}
if(!source || !element) { return false; }
id = ~~(1 * element.getAttribute('data-componentId'));
if(!id) {
for(i in element.dom.attributes) {
attr = element.dom.attributes[i];
if(attr.name == 'data-componentid') {
id = parseInt(attr.value, 10);
break;
}
}
}
d = source.cloneNode(true);
d.id = Ext.id();
element.addCls('dragged');
draggedElement = element;
element.on('click', function() { this.removeCls('dragged') }, element, { single: true });
return {
ddel: d,
sourceEl: source,
repairXY: Ext.fly(source).getXY(),
sourceStore: view.store,
draggedRecord: me.originalStore.getById(id)
}
},
getRepairXY: function(event) {
var source = event.getTarget(view.itemSelector, 10), element = Ext.get(source);
if(draggedElement && draggedElement.hasCls('dragged')) {
Ext.defer(function() {
draggedElement.removeCls('dragged');
}, 50);
}
return this.dragData.repairXY;
}
});
},
showPanel: function() {
this.fireEvent('beforeShowHud', this.libraryView);
this.libraryPnl.show();
this.fireEvent('afterShowHud', this.libraryView);
},
hidePanel: function() {
this.fireEvent('beforeHideHud', this.libraryView);
this.libraryPnl.hide();
this.fireEvent('afterHideHud', this.libraryView);
},
addAdditionalEvents: function() {
var me = this,
me = me.libraryView;
me.getEl().on({
'click': {
delegate: '.toggle',
fn: function(event, element) {
var el = Ext.get(element),
parent = el.parent(),
panel = parent.parent().child('.x-library-inner-panel')
Ext.suspendLayouts();
if(panel.isVisible()) {
el.addCls('inactive');
el.removeCls('active');
panel.setStyle('display', 'none');
} else {
el.addCls('active');
el.removeCls('inactive');
panel.setStyle('display', 'block');
}
Ext.resumeLayouts(true);
}
}
});
}
});
Ext.define('Shopware.grid.plugin.Translation', {
extend: 'Ext.AbstractPlugin',
alternateClassName: [ 'Shopware.plugin.GridTranslation', 'Shopware.GridTranslation' ],
alias: [ 'plugin.gridtranslation' ],
requires: [ 'Ext.grid.column.Column' ],
mixins: {
observable: 'Ext.util.Observable'
},
grid: null,
translatableFields: [],
translationType: 'article',
translationCallback: Ext.emptyFn,
translationKey: null,
actionColumnItemGetClassCallback: Ext.emptyFn,
snippets: {
tooltip: 'Übersetzen'
},
constructor: function() {
var me = this;
me.callParent(arguments);
me.mixins.observable.constructor.call(me);
},
init: function(grid) {
var me = this;
me.grid = grid;
me.grid.on('reconfigure', me.onGridReconfigure, me);
me.onGridReconfigure();
me.callParent(arguments);
},
onGridReconfigure: function() {
var me = this;
if (!me.grid) {
return false;
}
me.translatableFields = me.getTranslatableFields();
if (me.translatableFields.length === 0) {
return false;
}
if (me.hasGridTranslationColumn()) {
return true;
}
var columns = me.grid.headerCt;
var actionColumn = null;
columns.items.each(function(column) {
if (column.getXType() === 'actioncolumn') {
actionColumn = column;
return true;
}
});
if (actionColumn) {
me.updateTranslationActionColumn(actionColumn);
}
return true;
},
hasGridTranslationColumn: function() {
var me = this, translationItemExist = false;
if (!me.grid) {
return translationItemExist;
}
var columns = me.grid.headerCt;
columns.items.each(function(column) {
if (column.getXType() === 'actioncolumn') {
if (me.hasActionColumnTranslationItem(column)) {
translationItemExist = true;
return false;
}
}
});
return translationItemExist;
},
hasActionColumnTranslationItem: function(column) {
var translationItemExist = false;
if (!column) {
return translationItemExist;
}
Ext.each(column.items, function(actionItem) {
if (actionItem.name === 'grid-translation-plugin')  {
translationItemExist = true;
return false;
}
});
return translationItemExist;
},
updateTranslationActionColumn: function(actionColumn) {
var me = this;
if (!me.hasActionColumnTranslationItem(actionColumn)) {
actionColumn.items.push(me.createTranslationActionColumnItem());
actionColumn.width = actionColumn.width + 30;
}
},
createTranslationActionColumnItem: function() {
var me = this;
return {
iconCls: 'sprite-globe-green',
tooltip: me.snippets.tooltip,
name: 'grid-translation-plugin',
handler: function (view, rowIndex, colIndex, item, opts, record) {
me.actionColumnClick(record);
},
getClass: me.actionColumnItemGetClassCallback
};
},
getTranslatableFields: function() {
var me = this;
if (!me.grid) {
return false;
}
var columns = me.grid.headerCt;
var translatableFields = [];
columns.items.each(function(column) {
if (column.initialConfig.translationEditor) {
translatableFields.push(column.initialConfig.translationEditor);
}
});
return translatableFields;
},
actionColumnClick: function(record) {
var me = this;
me.translatableFields = me.getTranslatableFields();
if (!record || me.translatableFields.length === 0) {
return false;
}
if(typeof Shopware.app.Application.addSubApplication !== 'function') {
Ext.Error.raise('Your ExtJS application does not support sub applications');
}
Ext.each(me.translatableFields, function(field) {
if (record.get(field.name)) {
field.emptyText = record.get(field.name);
}
});
me.translationKey = record.getId();
Shopware.app.Application.addSubApplication({
name: 'Shopware.apps.Translation',
eventScope: me,
translationCallback: me.translationCallback,
translatableFields: me.translatableFields,
translationType: me.translationType,
translationMerge: me.translationMerge,
translationKey: me.translationKey
});
return true;
},
destroy: function() {
this.clearListeners();
delete this.grid
this.callParent(arguments);
}
});
Ext.define('Shopware.form.PluginPanel',
{
extend: 'Ext.form.Panel',
alternateClassName: 'Shopware.form.ConfigPanel',
alias: 'widget.plugin-form-panel',
shopStore: Ext.create('Shopware.apps.Base.store.ShopLanguage'),
formStore: Ext.create('Shopware.apps.Base.store.Form'),
injectActionButtons: false,
descriptionField: true,
_descriptionAdded: false,
noFormIdConfiguredErrorText: 'No formId is passed to the component configuration',
formNotLoadedErrorText: "The form store couldn't be loaded successfully.",
snippets: {
resetButton: 'Zurücksetzen',
saveButton: 'Speichern',
description: 'Beschreibung',
onSaveFormTitle: 'Formular speichern',
saveFormSuccess: 'Formular "[name]" wurde gespeichert.',
saveFormError: 'Forumular "[name]" konnte nicht gespeichert werden.'
},
initComponent: function() {
var me = this;
if(!me.formId) {
Ext.Error.raise(me.noFormIdConfiguredErrorText);
return false;
}
me.formId = ~~(1 * me.formId);
if(!me.shopStore.getCount()) {
me.shopStore.load();
}
me.formStore.on('load', me.onLoadForm, me, { single: true });
me.formStore.load({
filters: [{
property: 'id',
value: me.formId
}]
});
me.callParent(arguments);
},
onLoadForm: function(store, records, success) {
var me = this;
if (success !== true || !records.length) {
Ext.Error.raise(me.formNotLoadedErrorText);
return false;
}
me.initForm(records[0]);
},
initForm: function(form) {
var me = this;
if(me.shopStore.isLoading() || !me.rendered) {
Ext.defer(me.initForm, 100, me, [ form ]);
return false;
}
if(me.injectActionButtons) {
me.addDocked(me.getButtons());
}
me.add(me.getItems(form));
me.loadRecord(form);
me.fireEvent('form-initialized', me);
},
getButtons: function() {
var me = this;
return {
dock: 'bottom',
xtype: 'toolbar',
items: ['->', {
text: me.snippets.resetButton,
cls: 'secondary',
action: 'reset'
}, {
text: me.snippets.saveButton,
cls: 'primary',
action: 'save'
}]
};
},
getItems: function(form) {
var me = this,
type, name, value,
elementLabel = '',
elementDescription = '', elementName,
items = [],
tabs = [], options;
if(form.get('description') && me.descriptionField) {
if(!me._descriptionAdded) {
items.push({
xtype: 'fieldset',
margin: 10,
title: me.snippets.description,
html: form.get('description')
});
me._descriptionAdded = true;
}
}
me.shopStore.each(function(shop) {
var fields = [];
form.getElements().each(function(element) {
value = element.getValues().find('shopId', shop.getId(), 0, false, true, true);
value = element.getValues().getAt(value);
var initialValue = value;
type = element.get('type').toLowerCase();
type = 'base-element-' + type;
name = 'values[' + shop.get('id') + ']['+ element.get('id') + ']';
options = element.get('options');
options = options || {};
delete options.attributes;
elementName = element.get('name');
elementLabel = element.get('label');
elementDescription = element.get('description');
if(element.associations.containsKey('getTranslation')) {
if(element.getTranslation().getAt(0) && element.getTranslation().getAt(0).get('label')) {
elementLabel = element.getTranslation().getAt(0).get('label');
}
if(element.getTranslation().getAt(0) && element.getTranslation().getAt(0).get('description')) {
elementDescription = element.getTranslation().getAt(0).get('description');
}
}
var field = Ext.apply({
xtype: type,
name: name,
elementName: elementName,
fieldLabel: elementLabel,
helpText: elementDescription, //helpText
value: value ? value.get('value') : element.get('value'),
emptyText: shop.get('default') ? null : element.get('value'),
disabled: !element.get('scope') && !shop.get('default'),
allowBlank: !element.get('required') || !shop.get('default')
}, options);
if (field.xtype == "base-element-boolean" || field.xtype == "base-element-checkbox") {
field = me.convertCheckBoxToComboBox(field, shop, initialValue);
}
else if ((field.xtype == "base-element-datetime" ||
field.xtype == "base-element-date" ||
field.xtype == "base-element-time") && field.value) {
field.value += '+00:00';
field.value = new Date(field.value);
field.value = new Date((field.value.getTime() + (field.value.getTimezoneOffset() * 60 * 1000)));
}
fields.push(field);
});
if(fields.length > 0) {
tabs.push({
xtype: 'base-element-fieldset',
title: shop.get('name'),
items: fields
});
}
});
if(tabs.length > 1) {
items.push({
xtype: 'tabpanel',
bodyStyle: 'background-color: transparent !important',
border: 0,
activeTab: 0,
enableTabScroll: true,
deferredRender: false,
items: tabs,
plain: true
});
} else if(tabs.length == 1) {
if(tabs[0].title) {
delete tabs[0].title;
}
items.push({
xtype: 'panel',
bodyStyle: 'background-color: transparent !important',
border: 0,
layout: 'fit',
items: tabs,
bodyBorder: 0
});
}
return items;
},
convertCheckBoxToComboBox: function (field, shop, initialValue) {
var booleanSelectValue = field.value;
if (shop.get('id') != 1 && initialValue === undefined) {
booleanSelectValue = '';
}
else {
booleanSelectValue = Boolean(field.value);
}
Ext.apply(field, {
xtype: "base-element-boolean-select",
value: booleanSelectValue,
emptyText: ""
});
return field;
},
onSaveForm: function(formPanel, closeWindow, callback) {
var me = this,
basicForm = formPanel.getForm() || me.getForm(),
form = basicForm.getRecord(),
values = basicForm.getFieldValues(),
fieldName, fieldValue, valueStore,
win = formPanel.up('window');
if (!basicForm.isValid()) {
return;
}
closeWindow = closeWindow || false;
form.getElements().each(function(element) {
valueStore = element.getValues();
valueStore.removeAll();
me.shopStore.each(function(shop) {
fieldName = 'values[' + shop.get('id') + ']['+ element.get('id') + ']';
fieldValue = values[fieldName];
if(fieldValue !== '' && fieldValue !== null) {
valueStore.add({
shopId: shop.get('id'),
value: fieldValue
});
}
});
});
form.setDirty();
var title = me.snippets.onSaveFormTitle;
form.store.add(form);
form.store.sync({
success: function (records, operation) {
var template = new Ext.Template(me.snippets.saveFormSuccess),
message = template.applyTemplate({
name: form.data.label || form.data.name
});
Shopware.Notification.createGrowlMessage(title, message, win.title);
if(closeWindow) {
win.destroy();
}
if(callback) {
callback.apply(me, records, operation);
}
},
failure: function (records, operation) {
var template = new Ext.Template(me.snippets.saveFormError),
message = template.applyTemplate({
name: form.data.label || form.data.name
});
Shopware.Notification.createGrowlMessage(title, message, win.title);
}
});
}
});
Ext.define('Shopware.component.Preloader', {
activePrio: 0,
eventProvider: undefined,
finished: false,
requiredComponents: [{
'Shopware.apps.Article': false,
'Shopware.apps.ArticleList': false,
'Shopware.apps.Order': false,
'Shopware.apps.Customer': false,
'Shopware.apps.ProductStream': false
}, {
'Shopware.apps.Emotion': false,
'Shopware.apps.MediaManager': false
}, {
'Shopware.apps.Blog': false
}],
bindEvents: function(cmp) {
var me = this;
me.eventProvider = cmp;
me.eventProvider.on('baseComponentsReady', me.onBaseComponentsReady, me, { single: true });
me.eventProvider.on('subAppLoaded', me.onSubAppLoaded, me);
},
onBaseComponentsReady: function() {
var me = this;
me.triggerLoadPrio();
},
onSubAppLoaded: function(subApp) {
var me = this,
clsName = subApp.$className;
if(me.finished) {
return;
}
if(!me.requiredComponents[me.activePrio].hasOwnProperty(clsName)) {
return;
}
me.requiredComponents[me.activePrio][clsName] = true;
if(me.isPrioLoaded(me.activePrio)) {
me.activePrio += 1;
if(!me.requiredComponents[me.activePrio]) {
me.finished = true;
me.eventProvider.removeListener('subAppLoaded', me.onSubAppLoaded, me);
return;
}
me.triggerLoadPrio();
}
},
isPrioLoaded: function(prio) {
var me = this,
prioGroup = me.requiredComponents[prio],
allLoaded = true;
Ext.iterate(prioGroup, function(index, item) {
if(!item) {
allLoaded = false;
return false;
}
});
return allLoaded;
},
triggerLoadPrio: function() {
var me = this,
prioGroup = me.requiredComponents[me.activePrio];
Ext.iterate(prioGroup, function(name, item) {
if(!Ext.ClassManager.isCreated(name)) {
Ext.require(name);
}
});
}
});
Ext.define('Shopware.component.IconPreloader', {
loadPath: null,
extension: '.css',
iconSheets: [
'extra-icon-set-01', 'extra-icon-set-02', 'extra-icon-set-03', 'extra-icon-set-04',
'extra-icon-set-05', 'extra-icon-set-06', 'extra-icon-set-07', 'extra-icon-set-08',
'extra-icon-set-keys', 'extra-icon-set-devices', 'core-icon-set-new'
],
preloadDelay: 500,
constructor: function(options) {
var me = this, task;
if(!options.hasOwnProperty('loadPath')) {
Ext.Error.raise({
sourceClass: me.$className,
sourceMethod: "constructor",
msg: me.$className + " needs an loadPath to work correctly."
});
}
me.loadPath = options.loadPath;
Ext.defer(me.startPreloading, me.preloadDelay, me);
},
getLoadPath: function() {
return this.loadPath;
},
setLoadPath: function(path) {
if(!path.length) {
return false;
}
this.loadPath = path;
return true;
},
startPreloading: function() {
var me = this;
Ext.Array.each(me.iconSheets, function(sheet) {
me.injectStylesheet(sheet);
});
},
injectStylesheet: function(sheet) {
var me = this,
el = document.createElement('link'),
head = Ext.getHead(),
basicOpts = {
'rel': 'stylesheet',
'type': 'text/css',
'media': 'all'
};
basicOpts = Ext.apply(basicOpts, {
'href': me.loadPath + '/' + sheet + me.extension + "?" + Ext.shopwareRevision
});
for(var key in basicOpts) {
el.setAttribute(key, basicOpts[key]);
}
head.appendChild(el);
}
});
Ext.define('Shopware.global.ErrorReporter', {
extend: 'Ext.app.Controller',
mainWindow: null,
snippets: {
general: {
title: 'Shopware Fehler Reporter',
error_title: 'Fehler-Information',
browser_title: 'Browser-Information',
cancel: 'Abbrechen'
},
xhr: {
module: 'Modul',
request_path: 'Request-Pfad',
http_error: 'HTTP Fehlermeldung',
http_status: 'HTTP Statuscode',
error_desc: 'Fehler Beschreibung',
module_files: 'Module-Dateien',
class_name: 'Klassen-Name',
path: 'Pfad',
type: 'Typ',
unknown_type: 'Unbekannter Typ',
reload_module: 'Modul erneut laden'
},
eval: {
reload_admin: 'Administration neuladen',
error_type: 'Fehler-Typ',
error_msg: 'Fehlermeldung'
},
browser: {
os: 'Betriebssystem',
browser_engine: 'Browser-Engine',
window_size: 'Fenster-Größe',
java_enabled: 'Java aktiviert',
cookies_enabled: 'Cookies aktiviert',
lang: 'Sprache',
plugins: 'Browser-Plugins',
plugin_name: 'Plugin-Name',
plugin_path: 'Plugin-Pfad'
},
response: {
name: 'Server Antwort',
errorOverview: 'Fehlerübersicht'
}
},
bindEvents: function (cmp) {
var me = this;
cmp.on('Ext.Loader:xhrFailed', me.onXhrErrorOccurs, me);
cmp.on('Ext.Loader:evalFailed', me.onEvalErrorOccurs, me);
},
onXhrErrorOccurs: function (xhr, namespace, requestType) {
var me = this;
me.mainWindow = Ext.create('Ext.window.Window', {
width: 800,
height: 600,
modal: true,
resizable: false,
title: me.snippets.general.title,
dockedItems: [me.createActionToolbar(namespace, true)],
renderTo: Ext.getBody(),
items: [{
xtype: 'tabpanel',
defaults: {
bodyPadding: 15
},
items: [
{
title: me.snippets.general.error_title,
items: [
me.createErrorInformation(xhr, namespace, requestType),
me.createErrorDescription(xhr),
me.createErrorFilesList(namespace)
]
}, {
title: me.snippets.general.browser_title,
items: [
me.createBrowserInformation(),
me.createUserAgentInformation(),
me.createBrowserPluginList()
]
},
me.createServerResponseTab(me, xhr)
]
}]
}).show();
},
onEvalErrorOccurs: function (err, xhr, namespace, requestType) {
var me = this;
me.mainWindow = Ext.create('Ext.window.Window', {
width: 800,
height: 600,
modal: true,
resizable: false,
title: me.snippets.general.title,
dockedItems: [me.createActionToolbar(namespace, false)],
renderTo: Ext.getBody(),
items: [{
xtype: 'tabpanel',
defaults: {
bodyPadding: 15
},
items: [{
title: me.snippets.general.error_title,
items: [
me.createEvalErrorInformation(err, xhr, namespace, requestType),
me.createEvalErrorDescription(err),
me.createErrorFilesList(namespace)
]
}, {
title: me.snippets.general.browser_title,
items: [
me.createBrowserInformation(),
me.createUserAgentInformation(),
me.createBrowserPluginList()
]
}, me.createServerResponseTab(me, xhr)]
}]
}).show();
},
createErrorInformation: function (xhr, namespace, requestType) {
var me = this;
return {
xtype: 'fieldset',
title: me.snippets.general.error_title,
layout: 'column',
defaults: {
xtype: 'container',
columnWidth: 0.5,
layout: 'anchor',
defaults: {
anchor: '100%',
readOnly: true,
xtype: 'displayfield',
labelWidth: 155,
labelStyle: 'margin-top: 0'
}
},
items: [{
items: [{
fieldLabel: me.snippets.xhr.module,
value: namespace.prefix
}, {
fieldLabel: me.snippets.xhr.request_path,
value: namespace.path
}]
}, {
margin: '0 0 0 15',
items: [{
fieldLabel: me.snippets.xhr.http_error,
value: xhr.statusText
}, {
fieldLabel: me.snippets.xhr.http_status,
value: Ext.String.format('[0] / [1]', xhr.status, requestType.toUpperCase())
}]
}]
};
},
createErrorDescription: function (xhr) {
var me = this;
return {
xtype: 'fieldset',
title: me.snippets.xhr.error_desc,
layout: 'anchor',
height: 175,
items: [{
xtype: 'textarea',
anchor: '100%',
height: 125,
value: xhr.responseText
}]
}
},
createErrorFilesList: function (namespace) {
var data = [], me = this, store;
var getFileType = function (path) {
var regEx = /^([a-zA-Z]+)\//,
result = regEx.exec(path);
if (!result) {
return me.snippets.xhr.unknown_type;
}
result = result[1];
return result.charAt(0).toUpperCase() + result.slice(1);
};
Ext.each(namespace.classNames, function (cls, i) {
data.push({
id: i + 1,
name: cls,
path: namespace.files[i],
type: getFileType(namespace.files[i])
});
});
store = Ext.create('Ext.data.Store', {
fields: ['id', 'name', 'path', 'type'],
groupField: 'type',
data: data
});
return {
xtype: 'gridpanel',
store: store,
title: me.snippets.xhr.module_files,
height: 175,
features: [{
ftype: 'grouping',
groupHeaderTpl: '{name} ({rows.length})'
}],
columns: [{
dataIndex: 'id',
header: '#',
width: 35
}, {
dataIndex: 'name',
header: me.snippets.xhr.class_name,
flex: 1,
renderer: function (val) {
return '<strong>' + val + '</strong>';
}
}, {
dataIndex: 'path',
header: me.snippets.xhr.path,
flex: 1
}, {
dataIndex: 'type',
header: me.snippets.xhr.type,
flex: 1
}]
};
},
createActionToolbar: function (namespace, showReload) {
var me = this, reloadButton, toolbar;
reloadButton = Ext.create('Ext.button.Button', {
text: me.snippets.xhr.reload_module,
cls: 'primary',
handler: function () {
Ext.require(namespace.classNames);
me.mainWindow.destroy();
}
});
toolbar = Ext.create('Ext.toolbar.Toolbar', {
dock: 'bottom',
padding: 5,
items: ['->', {
xtype: 'button',
text: me.snippets.general.cancel,
cls: 'secondary',
handler: function () {
me.mainWindow.destroy();
}
}]
});
if (showReload) {
toolbar.add(reloadButton);
} else {
toolbar.add({
xtype: 'button',
text: me.snippets.eval.reload_admin,
cls: 'primary',
handler: function () {
window.location.reload();
}
});
}
return toolbar;
},
createEvalErrorInformation: function (err, xhr, namespace) {
var me = this;
return {
xtype: 'fieldset',
title: me.snippets.general.error_title,
layout: 'column',
defaults: {
xtype: 'container',
columnWidth: 0.5,
layout: 'anchor',
defaults: {
anchor: '100%',
readOnly: true,
xtype: 'displayfield',
labelWidth: 155,
labelStyle: 'margin-top: 0'
}
},
items: [{
items: [{
fieldLabel: me.snippets.xhr.module,
value: namespace.prefix
}, {
fieldLabel: me.snippets.xhr.request_path,
value: namespace.path
}]
}, {
margin: '0 0 0 15',
items: [{
fieldLabel: me.snippets.eval.error_type,
value: err.name
}, {
fieldLabel: me.snippets.eval.error_msg,
value: err.message
}]
}]
};
},
createEvalErrorDescription: function (err) {
return {
xtype: 'fieldset',
title: 'Stack-Trace',
layout: 'anchor',
height: 175,
items: [{
xtype: 'textarea',
anchor: '100%',
height: 125,
value: err.stack
}]
}
},
createUserAgentInformation: function () {
return {
xtype: 'fieldset',
title: 'User-Agent',
layout: 'anchor',
height: 125,
items: [{
xtype: 'textarea',
anchor: '100%',
height: 75,
value: navigator.userAgent
}]
}
},
createBrowserInformation: function () {
var me = this, uaParser = new UAParser(), uaResult = uaParser.getResult();
return {
xtype: 'fieldset',
title: me.snippets.general.browser_title,
layout: 'column',
defaults: {
xtype: 'container',
columnWidth: 0.5,
layout: 'anchor',
defaults: {
anchor: '100%',
readOnly: true,
xtype: 'displayfield',
labelWidth: 155,
labelStyle: 'margin-top: 0'
}
},
items: [{
items: [{
fieldLabel: 'Browser',
value: Ext.String.format('[0] [1]', uaResult.browser.name || 'No data', uaResult.browser.version || 'No data')
}, {
fieldLabel: me.snippets.browser.browser_engine,
value: Ext.String.format('[0] [1]', uaResult.engine.name || 'No data', uaResult.engine.version || 'No data')
}, {
fieldLabel: me.snippets.browser.os,
value: Ext.String.format('[0] [1]', uaResult.os.name || 'No data', uaResult.os.version || 'No data')
}, {
fieldLabel: 'ExtJS',
value: Ext.versions.extjs.version
}]
}, {
margin: '0 0 0 15',
items: [{
fieldLabel: me.snippets.browser.window_size,
value: Ext.String.format('[0]x[1] Pixel', window.outerWidth, window.outerHeight)
}, {
xtype: 'checkbox',
labelStyle: 'margin-top: 5px',
fieldLabel: me.snippets.browser.java_enabled,
checked: !!navigator.javaEnabled()
}, {
xtype: 'checkbox',
labelStyle: 'margin-top: 5px',
fieldLabel: me.snippets.browser.cookies_enabled,
checked: !!navigator.cookieEnabled
}, {
fieldLabel: me.snippets.browser.lang,
value: navigator.language || navigator.userLanguage
}]
}]
};
},
createBrowserPluginList: function () {
var me = this, data = [], store;
Ext.each(navigator.plugins, function (plugin, i) {
data.push({
id: i + 1,
name: plugin.description || plugin.name,
path: plugin.filename
});
});
store = Ext.create('Ext.data.Store', {
fields: ['id', 'name', 'path'],
data: data
});
return {
xtype: 'gridpanel',
store: store,
title: me.snippets.browser.plugins,
height: 175,
columns: [{
dataIndex: 'id',
header: '#',
width: 35
}, {
dataIndex: 'name',
header: me.snippets.browser.plugin_name,
flex: 1,
renderer: function (val) {
return '<strong>' + val + '</strong>';
}
}, {
dataIndex: 'path',
header: me.snippets.browser.plugin_path,
flex: 1
}]
};
},
createServerResponseTab: function (me, xhr) {
var store = Ext.create('Ext.data.Store', {
fields: ['type', 'text', 'line']
});
return {
xtype: 'container',
title: me.snippets.response.name,
layout: {
type: 'vbox',
align: 'stretch'
},
items: [
{
xtype: 'ace-editor',
value: xhr.responseText,
mode: 'javascript',
readOnly: true,
height: 320,
useWorker: false,
listeners: {
setAceEditorMode: function () {
me.editor = this.editor;
var session = this.editor.session;
var WorkerClient = require('ace/worker/worker_client').WorkerClient;
var worker = new WorkerClient(['ace'], 'ace/mode/javascript_worker', 'JavaScriptWorker');
worker.send('setOptions', [{
esnext: false,
moz: false,
devel: true,
browser: true,
node: false,
laxcomma: false,
laxbreak: false,
lastsemic: false,
onevar: false,
passfail: false,
maxerr: 300,
expr: false,
multistr: false,
globalstrict: false
}]);
worker.attachToDocument(session.getDocument());
worker.on('annotate', function(results) {
results.data.forEach(function (item) {
if (item.type !== 'error') {
return;
}
store.add({
type: item.type,
line: item.row,
text: item.text
});
});
var item = store.getAt(0);
if (item) {
me.editor.gotoLine(item.get('line'), 0, true);
}
session.setAnnotations(results.data);
});
worker.on('terminate', function() {
session.clearAnnotations();
});
}
}
},
{
xtype: 'grid',
store: store,
height: 160,
title: me.snippets.response.errorOverview,
flex: 1,
columns: [
{
header: 'Type',
dataIndex: 'type',
flex: 0.5
},
{
header: 'Line',
dataIndex: 'line',
flex: 0.5
},
{
header: 'Text',
dataIndex: 'text',
flex: 1
},
],
listeners: {
itemclick: function (grid, record) {
me.editor.gotoLine(record.get('line'), 0, true);
}
}
},
]
};
}
});
!function(window,undefined){"use strict";var EMPTY="",UNKNOWN="?",FUNC_TYPE="function",UNDEF_TYPE="undefined",OBJ_TYPE="object",MAJOR="major",MODEL="model",NAME="name",TYPE="type",VENDOR="vendor",VERSION="version",ARCHITECTURE="architecture",CONSOLE="console",MOBILE="mobile",TABLET="tablet";var util={ has:function(str1,str2){return str2.toLowerCase().indexOf(str1.toLowerCase())!==-1},lowerize:function(str){return str.toLowerCase()} };var mapper={ rgx:function(){for(var result,i=0,j,k,p,q,matches,match,args=arguments;i<args.length;i+=2){var regex=args[i],props=args[i+1];if(typeof result===UNDEF_TYPE){result={};for(p in props){q=props[p];if(typeof q===OBJ_TYPE){result[q[0]]=undefined}else{result[q]=undefined}}}for(j=k=0;j<regex.length;j++){matches=regex[j].exec(this.getUA());if(!!matches){for(p in props){match=matches[++k];q=props[p];if(typeof q===OBJ_TYPE&&q.length>0){if(q.length==2){if(typeof q[1]==FUNC_TYPE){result[q[0]]=q[1].call(this,match)}else{result[q[0]]=q[1]}}else if(q.length==3){if(typeof q[1]===FUNC_TYPE&&!(q[1].exec&&q[1].test)){result[q[0]]=match?q[1].call(this,match,q[2]):undefined}else{result[q[0]]=match?match.replace(q[1],q[2]):undefined}}else if(q.length==4){result[q[0]]=match?q[3].call(this,match.replace(q[1],q[2])):undefined}}else{result[q]=match?match:undefined}}break}}if(!!matches)break}return result},str:function(str,map){for(var i in map){if(typeof map[i]===OBJ_TYPE&&map[i].length>0){for(var j=0;j<map[i].length;j++){if(util.has(map[i][j],str)){return i===UNKNOWN?undefined:i}}}else if(util.has(map[i],str)){return i===UNKNOWN?undefined:i}}return str} };var maps={ browser:{ oldsafari:{ major:{ 1:["/8","/1","/3"],2:"/4","?":"/" },version:{ "1.0":"/8",1.2:"/1",1.3:"/3","2.0":"/412","2.0.2":"/416","2.0.3":"/417","2.0.4":"/419","?":"/" } } },device:{ sprint:{ model:{ "Evo Shift 4G":"7373KT" },vendor:{ HTC:"APA",Sprint:"Sprint" } } },os:{ windows:{ version:{ ME:"4.90","NT 3.11":"NT3.51","NT 4.0":"NT4.0",2000:"NT 5.0",XP:["NT 5.1","NT 5.2"],Vista:"NT 6.0",7:"NT 6.1",8:"NT 6.2",RT:"ARM" } } } };var regexes={ browser:[[/(opera\smini)\/((\d+)?[\w\.-]+)/i,/(opera\s[mobiletab]+).+version\/((\d+)?[\w\.-]+)/i,/(opera).+version\/((\d+)?[\w\.]+)/i,/(opera)[\/\s]+((\d+)?[\w\.]+)/i],[NAME,VERSION,MAJOR],[/\s(opr)\/((\d+)?[\w\.]+)/i],[[NAME,"Opera"],VERSION,MAJOR],[/(kindle)\/((\d+)?[\w\.]+)/i,/(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?((\d+)?[\w\.]+)*/i,/(avant\s|iemobile|slim|baidu)(?:browser)?[\/\s]?((\d+)?[\w\.]*)/i,/(?:ms|\()(ie)\s((\d+)?[\w\.]+)/i,/(rekonq)((?:\/)[\w\.]+)*/i,/(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt)\/((\d+)?[\w\.-]+)/i],[NAME,VERSION,MAJOR],[/(yabrowser)\/((\d+)?[\w\.]+)/i],[[NAME,"Yandex"],VERSION,MAJOR],[/(comodo_dragon)\/((\d+)?[\w\.]+)/i],[[NAME,/_/g," "],VERSION,MAJOR],[/(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?((\d+)?[\w\.]+)/i],[NAME,VERSION,MAJOR],[/(dolfin)\/((\d+)?[\w\.]+)/i],[[NAME,"Dolphin"],VERSION,MAJOR],[/((?:android.+)crmo|crios)\/((\d+)?[\w\.]+)/i],[[NAME,"Chrome"],VERSION,MAJOR],[/version\/((\d+)?[\w\.]+).+?mobile\/\w+\s(safari)/i],[VERSION,MAJOR,[NAME,"Mobile Safari"]],[/version\/((\d+)?[\w\.]+).+?(mobile\s?safari|safari)/i],[VERSION,MAJOR,NAME],[/webkit.+?(mobile\s?safari|safari)((\/[\w\.]+))/i],[NAME,[MAJOR,mapper.str,maps.browser.oldsafari.major],[VERSION,mapper.str,maps.browser.oldsafari.version]],[/(konqueror)\/((\d+)?[\w\.]+)/i,/(webkit|khtml)\/((\d+)?[\w\.]+)/i],[NAME,VERSION,MAJOR],[/(navigator|netscape)\/((\d+)?[\w\.-]+)/i],[[NAME,"Netscape"],VERSION,MAJOR],[/(swiftfox)/i,/(iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?((\d+)?[\w\.\+]+)/i,/(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix)\/((\d+)?[\w\.-]+)/i,/(mozilla)\/((\d+)?[\w\.]+).+rv\:.+gecko\/\d+/i,/(uc\s?browser|polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf)[\/\s]?((\d+)?[\w\.]+)/i,/(links)\s\(((\d+)?[\w\.]+)/i,/(gobrowser)\/?((\d+)?[\w\.]+)*/i,/(ice\s?browser)\/v?((\d+)?[\w\._]+)/i,/(mosaic)[\/\s]((\d+)?[\w\.]+)/i],[NAME,VERSION,MAJOR]],cpu:[[/(?:(amd|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i],[[ARCHITECTURE,"amd64"]],[/((?:i[346]|x)86)[;\)]/i],[[ARCHITECTURE,"ia32"]],[/windows\s(ce|mobile);\sppc;/i],[[ARCHITECTURE,"arm"]],[/((?:ppc|powerpc)(?:64)?)(?:\smac|;|\))/i],[[ARCHITECTURE,/ower/,"",util.lowerize]],[/(sun4\w)[;\)]/i],[[ARCHITECTURE,"sparc"]],[/(ia64(?=;)|68k(?=\))|arm(?=v\d+;)|(?:irix|mips|sparc)(?:64)?(?=;)|pa-risc)/i],[ARCHITECTURE,util.lowerize]],device:[[/\((ipad|playbook);[\w\s\);-]+(rim|apple)/i],[MODEL,VENDOR,[TYPE,TABLET]],[/(hp).+(touchpad)/i,/(kindle)\/([\w\.]+)/i,/\s(nook)[\w\s]+build\/(\w+)/i,/(dell)\s(strea[kpr\s\d]*[\dko])/i],[VENDOR,MODEL,[TYPE,TABLET]],[/\((ip[honed]+);.+(apple)/i],[MODEL,VENDOR,[TYPE,MOBILE]],[/(blackberry)[\s-]?(\w+)/i,/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|huawei|meizu|motorola)[\s_-]?([\w-]+)*/i,/(hp)\s([\w\s]+\w)/i,/(asus)-?(\w+)/i],[VENDOR,MODEL,[TYPE,MOBILE]],[/\((bb10);\s(\w+)/i],[[VENDOR,"BlackBerry"],MODEL,[TYPE,MOBILE]],[/android.+((transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+))/i],[[VENDOR,"Asus"],MODEL,[TYPE,TABLET]],[/(sony)\s(tablet\s[ps])/i],[VENDOR,MODEL,[TYPE,TABLET]],[/(nintendo)\s([wids3u]+)/i],[VENDOR,MODEL,[TYPE,CONSOLE]],[/((playstation)\s[3portablevi]+)/i],[[VENDOR,"Sony"],MODEL,[TYPE,CONSOLE]],[/(sprint\s(\w+))/i],[[VENDOR,mapper.str,maps.device.sprint.vendor],[MODEL,mapper.str,maps.device.sprint.model],[TYPE,MOBILE]],[/(htc)[;_\s-]+([\w\s]+(?=\))|\w+)*/i,/(zte)-(\w+)*/i,/(alcatel|geeksphone|huawei|lenovo|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]+)*/i],[VENDOR,[MODEL,/_/g," "],[TYPE,MOBILE]],[/\s((milestone|droid[2x]?))[globa\s]*\sbuild\//i,/(mot)[\s-]?(\w+)*/i],[[VENDOR,"Motorola"],MODEL,[TYPE,MOBILE]],[/android.+\s((mz60\d|xoom[\s2]{0,2}))\sbuild\//i],[[VENDOR,"Motorola"],MODEL,[TYPE,TABLET]],[/android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n8000|sgh-t8[56]9))/i],[[VENDOR,"Samsung"],MODEL,[TYPE,TABLET]],[/((s[cgp]h-\w+|gt-\w+|galaxy\snexus))/i,/(sam[sung]*)[\s-]*(\w+-?[\w-]*)*/i,/sec-((sgh\w+))/i],[[VENDOR,"Samsung"],MODEL,[TYPE,MOBILE]],[/(sie)-(\w+)*/i],[[VENDOR,"Siemens"],MODEL,[TYPE,MOBILE]],[/(maemo|nokia).*(n900|lumia\s\d+)/i,/(nokia)[\s_-]?([\w-]+)*/i],[[VENDOR,"Nokia"],MODEL,[TYPE,MOBILE]],[/android\s3\.[\s\w-;]{10}((a\d{3}))/i],[[VENDOR,"Acer"],MODEL,[TYPE,TABLET]],[/android\s3\.[\s\w-;]{10}(lg?)-([06cv9]{3,4})/i],[[VENDOR,"LG"],MODEL,[TYPE,TABLET]],[/((nexus\s4))/i,/(lg)[e;\s-\/]+(\w+)*/i],[[VENDOR,"LG"],MODEL,[TYPE,MOBILE]],[/(mobile|tablet);.+rv\:.+gecko\//i],[TYPE,VENDOR,MODEL]],engine:[[/(presto)\/([\w\.]+)/i,/(webkit|trident|netfront|netsurf|amaya|lynx|w3m)\/([\w\.]+)/i,/(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,/(icab)[\/\s]([23]\.[\d\.]+)/i],[NAME,VERSION],[/rv\:([\w\.]+).*(gecko)/i],[VERSION,NAME]],os:[[/(windows)\snt\s6\.2;\s(arm)/i,/(windows\sphone(?:\sos)*|windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i],[NAME,[VERSION,mapper.str,maps.os.windows.version]],[/(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i],[[NAME,"Windows"],[VERSION,mapper.str,maps.os.windows.version]],[/\((bb)(10);/i],[[NAME,"BlackBerry"],VERSION],[/(blackberry)\w*\/?([\w\.]+)*/i,/(tizen)\/([\w\.]+)/i,/(android|webos|palm\os|qnx|bada|rim\stablet\sos|meego)[\/\s-]?([\w\.]+)*/i],[NAME,VERSION],[/(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]+)*/i],[[NAME,"Symbian"],VERSION],[/mozilla.+\(mobile;.+gecko.+firefox/i],[[NAME,"Firefox OS"],VERSION],[/(nintendo|playstation)\s([wids3portablevu]+)/i,/(mint)[\/\s\(]?(\w+)*/i,/(joli|[kxln]?ubuntu|debian|[open]*suse|gentoo|arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk)[\/\s-]?([\w\.-]+)*/i,/(hurd|linux)\s?([\w\.]+)*/i,/(gnu)\s?([\w\.]+)*/i],[NAME,VERSION],[/(cros)\s[\w]+\s([\w\.]+\w)/i],[[NAME,"Chromium OS"],VERSION],[/(sunos)\s?([\w\.]+\d)*/i],[[NAME,"Solaris"],VERSION],[/\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]+)*/i],[NAME,VERSION],[/(ip[honead]+)(?:.*os\s*([\w]+)*\slike\smac|;\sopera)/i],[[NAME,"iOS"],[VERSION,/_/g,"."]],[/(mac\sos\sx)\s?([\w\s\.]+\w)*/i],[NAME,[VERSION,/_/g,"."]],[/(haiku)\s(\w+)/i,/(aix)\s((\d)(?=\.|\)|\s)[\w\.]*)*/i,/(macintosh|mac(?=_powerpc)|plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos)/i,/(unix)\s?([\w\.]+)*/i],[NAME,VERSION]] };var UAParser=function(uastring){var ua=uastring||(window&&window.navigator&&window.navigator.userAgent?window.navigator.userAgent:EMPTY);if(!(this instanceof UAParser)){return new UAParser(uastring).getResult()}this.getBrowser=function(){return mapper.rgx.apply(this,regexes.browser)};this.getCPU=function(){return mapper.rgx.apply(this,regexes.cpu)};this.getDevice=function(){return mapper.rgx.apply(this,regexes.device)};this.getEngine=function(){return mapper.rgx.apply(this,regexes.engine)};this.getOS=function(){return mapper.rgx.apply(this,regexes.os)};this.getResult=function(){return{ ua:this.getUA(),browser:this.getBrowser(),engine:this.getEngine(),os:this.getOS(),device:this.getDevice(),cpu:this.getCPU() }};this.getUA=function(){return ua};this.setUA=function(uastring){ua=uastring;return this};this.setUA(ua)};if(typeof exports!==UNDEF_TYPE){if(typeof module!==UNDEF_TYPE&&module.exports){exports=module.exports=UAParser}exports.UAParser=UAParser}else{window.UAParser=UAParser;if(typeof define===FUNC_TYPE&&define.amd){define(function(){return UAParser})}if(typeof window.jQuery!==UNDEF_TYPE){var $=window.jQuery;var parser=new UAParser;$.ua=parser.getResult();$.ua.get=function(){return parser.getUA()};$.ua.set=function(uastring){parser.setUA(uastring);var result=parser.getResult();for(var prop in result){$.ua[prop]=result[prop]}}}}}(this);
Ext.define('Shopware.notification.SubscriptionWarning', {
snippets: {
licence_upgrade_warning: '[0]x plugin(s) require a licence upgrade.<br /><br /><b>Required upgrades:</b><br />[1]',
subscription_warning: 'Subscription(s) for [0]x plugin(s) are expired. <br /><br /><b>Expired plugins:</b><br />[1]',
expired_soon_subscription_warning: 'Subscription(s) for [0]x plugin(s) expire in a few days.<br /><br /><b>Soon expired plugins:</b><br />[1]',
expired_soon_subscription_days_warning: ' days',
invalid_licence: 'Licence(s) of [0]x plugin(s) are invalid.<br /><br /><b>Invalid licence(s):</b><br />[1]',
shop_license_upgrade: 'The license upgrade for the shop hasn\'t been executed yet.',
no_license: 'You may be a victim of counterfeiting. <br /><br /><b>No valid license found for plugins:</b><br />[1]',
expiring_license: 'Expiring license(s)',
expired_license: 'Expired license(s)',
expiring_license_warning: 'License(s) of [0]x plugin(s) are soon expiring.<br /><br /><b>Soon expired license(s):</b><br />[1]',
expired_license_warning: 'At least one license of your used plugins has expired. <br>Check this in your Shopware account under "Licenses > Licenses" and update your license immediately.',
unknown_license: 'Unlicensed plugins',
confirm_open_pluginmanager: 'You have installed unlicensed plugins. Do you want to open the Plugin Manager now to check your plugins?',
subscription: 'Subscription',
subscription_hide_message: 'Would you like to hide this message for a week?',
openPluginOverview: 'Open plugin overview',
importantInformation: 'Important Information',
noShopSecretWarning: 'In order to receive information about updates and install plugins, you need to log in to your Shopware account. If you don\'t have a Shopware account yet, you can easily register.',
login: 'Login now'
},
check: function () {
var me = this;
me.getPluginInformation(function (data) {
var pluginData = me.preparePluginData(data);
pluginData.expiredPluginSubscriptions.sort(me.sortPluginsByDaysLeftCallback);
me.displayNotices(pluginData, data);
});
},
checkSecret: function () {
Ext.Ajax.request({
url: '/stageware12/backend/PluginManager/checkSecret'
});
},
preparePluginData: function(data) {
var preparedData = {
isShopUpgraded: data.isShopUpgraded,
notUpgradedPlugins: [],
wrongVersionPlugins: [],
expiredPluginSubscriptions: [],
unknownLicensePlugins: [],
expiredLicensePlugins: []
},
plugins = data.plugins,
today = Ext.Date.clearTime(new Date()),
i = 0,
count = plugins.length;
for (i; i < count; i++) {
var plugin = plugins[i];
if (plugin.subscriptionUpgradeRequired) {
preparedData.notUpgradedPlugins.push({
label: plugin.label
});
}
if (plugin.wrongSubscription) {
preparedData.wrongVersionPlugins.push({
label: plugin.label
});
}
if (!Ext.isEmpty(plugin.subscriptionExpiration)) {
var subscriptionExpirationDate = Ext.Date.parse(plugin.subscriptionExpiration, 'Y-m-d'),
isSubscriptionExpired, daysDiffSubscription;
if (!Ext.isEmpty(subscriptionExpirationDate)) {
isSubscriptionExpired = subscriptionExpirationDate < today;
daysDiffSubscription = Math.round(Math.abs((subscriptionExpirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
if (isSubscriptionExpired) {
preparedData.expiredPluginSubscriptions.push({
label: plugin.label,
expired: isSubscriptionExpired,
daysLeft: isSubscriptionExpired ? 0 : daysDiffSubscription,
dayDiff: daysDiffSubscription
});
}
}
}
if (plugin.unknownLicense) {
preparedData.unknownLicensePlugins.push({
label: plugin.label
});
}
if (!Ext.isEmpty(plugin.licenseExpiration)) {
var licenseExpiration = Ext.Date.parse(plugin.licenseExpiration, 'Y-m-d'),
isLicenseExpired, daysDiffLicense;
if (!Ext.isEmpty(licenseExpiration)) {
isLicenseExpired = licenseExpiration < today;
daysDiffLicense = Math.round(Math.abs((licenseExpiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
if (!isLicenseExpired && daysDiffLicense > 14) {
continue;
}
preparedData.expiredLicensePlugins.push({
label: plugin.label,
expired: isLicenseExpired,
daysLeft: isLicenseExpired ? 0 : daysDiffLicense,
dayDiff: daysDiffLicense
});
}
}
}
return preparedData;
},
getPluginInformation: function (callback) {
var me = this;
Ext.Ajax.request({
url: '/stageware12/backend/PluginManager/getPluginInformation',
success: function (response) {
var responseData = Ext.decode(response.responseText);
if (!responseData || Ext.isEmpty(responseData.data)) {
return;
}
if (responseData.data.shopSecretMissing) {
Shopware.Notification.createStickyGrowlMessage({
title: me.snippets.importantInformation,
text: me.snippets.noShopSecretWarning,
width: 460,
btnDetail: {
text: me.snippets.login,
callback: function () {
Shopware.app.Application.addSubApplication({
name: 'Shopware.apps.PluginManager',
params: {
openLogin: true
}
});
}
}
});
}
if (responseData.success === true && responseData.data) {
callback(responseData.data);
}
}
});
},
displayNotices: function(data, rawData) {
var me = this,
expiredLicensePlugins = me.filterExpiredPlugins(data.expiredLicensePlugins, true),
soonExpiredLicensePlugins = me.filterExpiredPlugins(data.expiredLicensePlugins, false),
expiredPlugins = me.filterExpiredPlugins(data.expiredPluginSubscriptions, true),
soonExpiredPlugins = me.filterExpiredPlugins(data.expiredPluginSubscriptions, false);
if (data.isShopUpgraded == false) {
me.displayShopNotUpgradedShopMessage();
}
if (data.notUpgradedPlugins && data.notUpgradedPlugins.length > 0) {
me.displayNotUpgradedNotice(data.notUpgradedPlugins);
}
if (data.wrongVersionPlugins && data.wrongVersionPlugins.length > 0) {
me.displayWrongVersionNotice(data.wrongVersionPlugins);
}
if (expiredPlugins && expiredPlugins.length > 0) {
me.displaySubscriptionNotice(expiredPlugins);
}
if (soonExpiredPlugins && soonExpiredPlugins.length > 0) {
me.displayExpiredSoonSubscriptionNotice(soonExpiredPlugins);
}
if (expiredLicensePlugins && expiredLicensePlugins.length > 0) {
if (!rawData.live) {
return;
}
switch (me.getExpiredMode(expiredLicensePlugins)) {
case 'stop':
Ext.create('Shopware.window.ExpiredPluginStop');
break;
case 'warning':
Ext.create('Shopware.window.ExpiredPluginWarning');
break;
default:
me.displayExpiredLicensePluginsNotice(expiredLicensePlugins);
}
}
if (soonExpiredLicensePlugins && soonExpiredLicensePlugins.length > 0) {
me.displaySoonExpiredLicensePluginsNotice(soonExpiredLicensePlugins);
}
if (data.unknownLicensePlugins && data.unknownLicensePlugins.length > 0) {
me.displayUnknownLicensePluginsNotice(data.unknownLicensePlugins);
}
},
displayWrongVersionNotice: function(plugins) {
var me = this,
pluginNames = me.getPluginNamesMessage(plugins, '<br />');
Shopware.Notification.createStickyGrowlMessage({
text: Ext.String.format(me.snippets.invalid_licence, plugins.length, pluginNames),
width: 440
});
},
displayNotUpgradedNotice: function(plugins) {
var me = this,
pluginNames = me.getPluginNamesMessage(plugins, '<br />');
Shopware.Notification.createStickyGrowlMessage({
text: Ext.String.format(me.snippets.licence_upgrade_warning, plugins.length, pluginNames),
width: 440
});
},
displaySubscriptionNotice: function(plugins) {
var me = this,
pluginNames = me.getPluginNamesMessage(plugins, '<br />');
if (Ext.util.Cookies.get('hideSubscriptionNotice') !== null) {
return;
}
Shopware.Notification.createStickyGrowlMessage({
text: Ext.String.format(me.snippets.subscription_warning, plugins.length, pluginNames),
width: 440,
onCloseButton: function() {
Ext.Msg.confirm(
me.snippets.subscription,
me.snippets.subscription_hide_message,
function(answer) {
if (answer === 'yes') {
var currentDate = new Date();
currentDate.setDate(currentDate.getDate() + 7);
Ext.util.Cookies.set('hideSubscriptionNotice', 1, currentDate);
}
}
);
}
});
},
displayExpiredSoonSubscriptionNotice: function(plugins) {
var me = this,
pluginNames = me.getSoonExpiredPluginNamesMessage(plugins, '<br />');
Shopware.Notification.createStickyGrowlMessage({
text: Ext.String.format(me.snippets.expired_soon_subscription_warning, plugins.length, pluginNames),
width: 440
});
},
displayShopNotUpgradedShopMessage: function(data) {
var me = this;
Shopware.Notification.createStickyGrowlMessage({
text: '<b>' + me.snippets.shop_license_upgrade + '</b>',
width: 440
});
},
displayExpiredLicensePluginsNotice: function() {
var me = this;
Shopware.Notification.createStickyGrowlMessage({
title: me.snippets.expired_license,
text: me.snippets.expired_license_warning,
width: 440,
btnDetail: {
text: me.snippets.openPluginOverview,
callback: function () {
Shopware.app.Application.addSubApplication({
name: 'Shopware.apps.PluginManager',
action: 'ExpiredPlugins'
});
}
}
});
},
displaySoonExpiredLicensePluginsNotice: function(plugins) {
var me = this,
pluginNames = me.getSoonExpiredPluginNamesMessage(plugins, '<br />');
Shopware.Notification.createStickyGrowlMessage({
title: me.snippets.expiring_license,
text: Ext.String.format(me.snippets.expiring_license_warning, plugins.length, pluginNames),
width: 440
});
},
displayUnknownLicensePluginsNotice: function(plugins) {
var me = this,
pluginNames = me.getPluginNamesMessage(plugins, '<br />');
Shopware.Notification.createStickyGrowlMessage({
text: Ext.String.format(me.snippets.no_license, plugins.length, pluginNames),
width: 440,
onCloseButton: function() {
Ext.Msg.alert(
me.snippets.unknown_license,
me.snippets.confirm_open_pluginmanager,
function() {
me.openPluginManager(plugins);
}
);
}
});
},
getPluginNamesMessage: function (plugins, separator) {
separator = (typeof separator == 'undefined' ? ',' : separator);
var pluginNameList = plugins.map(function (plugin) {
return plugin.label;
});
return pluginNameList.join(separator);
},
filterExpiredPlugins: function (plugins, expired) {
if (expired) {
return plugins.filter(function (plugin) {
if (plugin.expired && plugin.daysLeft == 0) {
return plugin;
}
});
} else {
return plugins.filter(function (plugin) {
if (!plugin.expired && plugin.daysLeft > 0) {
return plugin;
}
});
}
},
getSoonExpiredPluginNamesMessage: function (plugins, separator) {
var me = this;
separator = (typeof separator == 'undefined' ? ',' : separator);
var pluginNameList = plugins.map(function (plugin) {
return plugin.label + ' (' + plugin.daysLeft + me.snippets.expired_soon_subscription_days_warning + ')';
});
return pluginNameList.join(separator);
},
sortPluginsByDaysLeftCallback: function(a, b) {
if (a.daysLeft < b.daysLeft) {
return -1;
}
if (a.daysLeft > b.daysLeft) {
return 1;
}
return 0;
},
getExpiredMode: function(expiredPlugins) {
var modes = {
'stop': parseInt('21'),
'warning': parseInt('14')
}, currentMode = 'normal';
Object.keys(modes).forEach(function (mode) {
if (currentMode !== 'normal') {
return;
}
expiredPlugins.forEach(function (plugin) {
if (plugin.dayDiff >= modes[mode]) {
currentMode = mode;
}
});
});
return currentMode;
},
openPluginManager: function() {
Shopware.app.Application.addSubApplication({
name: 'Shopware.apps.PluginManager'
},
undefined,
function() {
Ext.Function.defer(function () {
Shopware.app.Application.fireEvent('display-installed-plugins');
}, 2000);
}
);
}
});
Ext.define('Shopware.component.ValidatePassword', {
singleton: true,
constructor: function() {
var me = this;
Ext.onReady(function() {
me.registerEventListeners();
});
},
registerEventListeners: function() {
Shopware.app.Application.on('Shopware.ValidatePassword', this.onPasswordValidation);
},
onPasswordValidation: function(successCallback, abortCallback, isRetryAttempt) {
var passwordPrompt = new Ext.window.MessageBox(),
displayText = 'Bitte gib dein Passwort ein:',
onFailure = function() {
Shopware.app.Application.fireEvent('Shopware.ValidatePassword', successCallback, abortCallback, true);
};
successCallback = !Ext.isFunction(successCallback) ? Ext.emptyFn : successCallback;
abortCallback = !Ext.isFunction(abortCallback) ? Ext.emptyFn : abortCallback;
if (isRetryAttempt === true) {
displayText = 'Das Passwort ist nicht korrekt. <br/><br/>' + displayText;
}
passwordPrompt.afterRender = Ext.MessageBox.afterRender;
passwordPrompt.textField.inputType = 'password';
passwordPrompt.prompt(
'Passwort Überprüfung',
displayText,
function (result, value) {
if (result !== 'ok' || !value) {
abortCallback();
return;
}
Ext.Ajax.request({
url: '/stageware12/backend/Login/validatePassword',
params: {
password: value
},
success: function(response) {
var responseObject = JSON.parse(response.responseText);
if (responseObject.success === true) {
successCallback();
} else {
onFailure();
}
},
failure: function() {
onFailure();
}
});
}
);
}
});
Ext.define('Shopware.window.ExpiredPluginWarning', {
extend: 'Enlight.app.Window',
autoScroll: true,
layout: 'fit',
height: 430,
width: 870,
autoShow: true,
title: 'Plugin Warnung',
footerButton: false,
initComponent: function() {
var me = this;
me.items = [
{
xtype: 'form',
items: [me.createContentPage()],
dockedItems: [{
xtype: 'toolbar',
dock: 'bottom',
ui: 'shopware-ui',
cls: 'shopware-toolbar',
items: me.getWindowButtons()
}]
},
];
me.callParent(arguments);
},
createContentPage: function () {
return {
xtype: 'container',
html: '<style>.plugin-window { color: #475C6A; } .plugin-window h2 { color: #495B67; font-weight: bold; font-size: 24px; margin-bottom: 12px } .plugin-window p { margin-bottom: 10px; line-height: 140%;} .plugin-window img { width: calc(100% - 100px); padding: 50px; margin: 40px 0 0 -30px; position: absolute; top: 50%; left: 50%; transform: translateX(-50%); } .plugin-window .bar { width: 50%; float: left; position: relative; } .plugin-window .bar:last-child { margin-left: 50%; } .plugin-window strong { font-weight: bold; } .plugin-window ul li { list-style: inherit; margin: 3px 0}</style><div class="plugin-window"><div class="bar"><img src="' + this.getImage() + '"></div><div class="bar"><div style="margin: 30px 0 0 -40px;">' + this.getText() + '</div></div></div>'
}
},
getImage: function() {
return '/stageware12/themes/Backend/ExtJs/backend/_resources/images/plugin_manager/warning.svg';
},
getText: function() {
return '<h2>Warnung!</h2><p>Für mindestens eines Deiner eingesetzten Plugins ist das Nutzungsrecht abgelaufen. Hintergrund kann sein:<ul><li>Ablauf der Plugin-Testphase (30 Tage), Plugin nicht aus dem Plugin-Manager gelöscht</li><li>Plugin-Miete beendet, Plugin nicht aus dem Plugin-Manager gelöscht</li><li>Plugin-Subscription nicht verlängert, dennoch ein Update des Plugins installiert</li><li>Änderung der Domain im Backend ohne Domain-Umzug im Shopware-Account</li><li>Plugin auf einer anderen Domain in Deinem Shopware Account registriert</li></ul></p><p>Kaufe/Miete betreffende Plugins über Deinen <a href="https://account.shopware.com/shops/shops" target="_blank">Shopware Account</a> um bestehende Lizenzverletzungen zu beheben und rechtliche Konsequenzen zu vermeiden.</p><p>Nutzt Du das Plugin nicht mehr, dann lösche es vollstândig aus dem Plugin-Manager. Shopware behält sich vor, installierte Plugins zu berechnen.</p><p><strong>Weitere Unterstützung findest Du in unseren <a href="https://docs.shopware.com/de/shopware-5-de/tutorials-und-faq/shopware-plugin-lizenzen-faq" target="_blank">FAQ</a></strong></p><p>Dein Shopware-Team</p>';
},
getWindowButtons: function() {
var me = this;
return [
'->',
{
xtype: 'button',
text: 'Schließen',
scope: me,
cls: 'secondary',
handler: function () {
me.destroy();
}
},
{
xtype: 'button',
text: 'Zum Plugin-Manager',
scope: me,
cls: 'primary',
handler: function () {
Shopware.app.Application.addSubApplication({
name: 'Shopware.apps.PluginManager',
action: 'ExpiredPlugins'
});
me.destroy();
}
}
];
}
});
Ext.define('Shopware.window.ExpiredPluginStop', {
extend: 'Shopware.window.ExpiredPluginWarning',
closable: false,
minimizable: false,
maximizable: false,
height: 450,
getImage: function() {
return '/stageware12/themes/Backend/ExtJs/backend/_resources/images/plugin_manager/stop.svg';
},
getText: function() {
return '<h2>Warnung!</h2><p>Für mindestens eines Deiner eingesetzten Plugins ist das Nutzungsrecht abgelaufen. Hintergrund kann sein:<ul><li>Ablauf der Plugin-Testphase (30 Tage), Plugin nicht aus dem Plugin-Manager gelöscht</li><li>Plugin-Miete beendet, Plugin nicht aus dem Plugin-Manager gelöscht</li><li>Plugin-Subscription nicht verlängert, dennoch ein Update des Plugins installiert</li><li>Änderung der Domain im Backend ohne Domain-Umzug im Shopware-Account</li><li>Plugin auf einer anderen Domain in Deinem Shopware Account registriert</li></ul></p><p>Kaufe/Miete betreffende Plugins über Deinen <a href="https://account.shopware.com/shops/shops" target="_blank">Shopware Account</a> um bestehende Lizenzverletzungen zu beheben und rechtliche Konsequenzen zu vermeiden.</p><p>Nutzt Du das Plugin nicht mehr, dann lösche es vollstândig aus dem Plugin-Manager. Shopware behält sich vor, installierte Plugins zu berechnen.</p><p><strong>Weitere Unterstützung findest Du in unseren <a href="https://docs.shopware.com/de/shopware-5-de/tutorials-und-faq/shopware-plugin-lizenzen-faq" target="_blank">FAQ</a></strong></p><p>Dein Shopware-Team</p>';
},
getWindowButtons: function() {
var me = this;
return [
{
xtype: 'checkbox',
listeners: {
change: function (checkbox, newValue) {
me.query('button').forEach(function (button) {
button.setDisabled(!newValue);
})
}
}
},
{
xtype: 'container',
html: 'Ja, ich habe diese Meldung zur Kenntnis genommen',
style: {
'margin-left': '5px'
}
},
'->',
{
xtype: 'button',
text: 'Okay, verstanden',
scope: me,
cls: 'secondary',
disabled: true,
handler: function () {
me.destroy();
}
},
{
xtype: 'button',
text: 'Plugin(s) anzeigen',
scope: me,
cls: 'primary',
disabled: true,
handler: function () {
Shopware.app.Application.addSubApplication({
name: 'Shopware.apps.PluginManager',
action: 'ExpiredPlugins'
});
me.destroy();
}
}
];
}
});
Ext.define('Shopware.grid.Searchable', {
extend: 'Ext.grid.Panel',
alias: ['widget.searchablegrid', 'widget.searchgrid'],
savedStores: {},
deleteButton: null,
listeners: {
beforerender: function (grid) {
this.loadStores(grid);
}
},
identifierDelimiter: ',',
allowedEntities: [],
availableStores: {
'blog': {
translation: 'Blogs',
storeConfiguration: {
model: 'Shopware.apps.Base.model.Blog',
entity: "Shopware\\Models\\Blog\\Blog"
},
},
'category': {
translation: 'Kategorien',
storeConfiguration: {
model: 'Shopware.apps.Base.model.Category',
entity: "Shopware\\Models\\Category\\Category"
},
},
'country': {
translation: 'Länder',
storeConfiguration: {
model: 'Shopware.apps.Base.model.Country',
entity: "Shopware\\Models\\Country\\Country"
},
},
'currency': {
translation: 'Währungen',
storeConfiguration: {
model: 'Shopware.apps.Base.model.Currency',
entity: "Shopware\\Models\\Shop\\Currency"
},
},
'customer': {
translation: 'Kunden',
storeConfiguration: {
model: 'Shopware.apps.Base.model.User',
entity: "Shopware\\Models\\Customer\\Customer"
},
},
'customer_group': {
translation: 'Kundengruppen',
storeConfiguration: {
model: 'Shopware.apps.Base.model.CustomerGroup',
entity: "Shopware\\Models\\Customer\\Group"
},
},
'dispatch': {
translation: 'Versandarten',
storeConfiguration: {
model: 'Shopware.apps.Base.model.Dispatch',
entity: "Shopware\\Models\\Dispatch\\Dispatch"
},
},
'landing_page': {
translation: 'Landingpages',
storeConfiguration: {
model: 'Shopware.apps.Base.model.LandingPage',
entity: "Shopware\\Models\\Emotion\\LandingPage"
},
},
'locale': {
translation: 'Lokalisierungen',
storeConfiguration: {
model: 'Shopware.apps.Base.model.Locale',
entity: "Shopware\\Models\\Shop\\Locale"
},
},
'manufacturer': {
translation: 'Hersteller',
storeConfiguration: {
model: 'Shopware.apps.Base.model.Supplier',
entity: "Shopware\\Models\\Article\\Supplier"
},
},
'product': {
translation: 'Produkte',
storeConfiguration: {
model: 'Shopware.apps.Base.model.Article',
entity: "Shopware\\Models\\Article\\Article"
},
},
'shop': {
translation: 'Shops',
storeConfiguration: {
model: 'Shopware.apps.Base.model.Shop',
entity: "Shopware\\Models\\Shop\\Shop"
},
},
'static': {
translation: 'Shopseiten',
storeConfiguration: {
model: 'Shopware.apps.Base.model.Static',
entity: "Shopware\\Models\\Site\\Site"
},
},
},
entityColumnDataIndex: 'entity',
identifierColumnDataIndex: 'identifier',
initComponent: function () {
this.plugins = this.createRowEditingPlugin();
this.entityStore = this.createEntityStore();
this.columns = this.buildColumns();
this.selModel = this.createSelectionModel();
this.dockedItems = this.createDockedItems();
this.callParent(arguments);
},
getColumns: function () {
return [];
},
reconfigure: function (store) {
this.addConverterToIdentifier(store.model);
this.callParent(arguments);
},
addConverterToIdentifier: function (model) {
var me = this;
Ext.each(model.getFields(), function (field) {
if (field.name === me.identifierColumnDataIndex && !field.hasCustomConvert) {
var originalConvert = field.convert;
field.hasCustomConvert = true;
field.convert = function (value) {
if ((Array.isArray(value) && value.length === 0) || value === '' || value === null) {
return null;
}
return originalConvert(value);
};
}
});
},
createRowEditingPlugin: function () {
var me = this;
return Ext.create('Ext.grid.plugin.RowEditing', {
clicksToEdit: 1,
keepExisting: true,
listeners: {
beforeedit: function (editor, options) {
me.changeStoreBeforeEdit(options.record);
},
validateedit: Ext.bind(this.loadStoresAfterEdit, this)
}
})
},
createDockedItems: function () {
return [ this.createToolBar() ];
},
createToolBar: function () {
var me = this;
return Ext.create('Ext.toolbar.Toolbar', {
ui: 'shopware-ui',
items: [
{
xtype: 'button',
iconCls: 'sprite-plus-circle',
text: 'Neuen Eintrag erstellen',
handler: Ext.bind(this.createNewEntry, me)
},
this.createActionBarDeleteButton()
]
});
},
createActionBarDeleteButton: function () {
this.deleteButton = Ext.create('Ext.button.Button',{
text: 'Ausgewählte Einträge löschen',
iconCls: 'sprite-minus-circle',
disabled: true,
handler: Ext.bind(this.deleteSelectedRecords, this)
});
return this.deleteButton;
},
buildColumns: function () {
var defaultColumns = this.buildDefaultColumns(),
customColumns = this.getColumns();
return Ext.Array.merge(defaultColumns, customColumns, {
xtype: 'actioncolumn',
flex: 1,
items: [ this.createRowDeleteButton() ]
});
},
createRowDeleteButton: function () {
var me = this;
return {
iconCls: 'sprite-minus-circle-frame',
handler: function (view, rowIndex, colIndex, item, opts, record) {
me.store.remove(record);
}
};
},
buildDefaultColumns: function () {
return [
{
header: 'Entität',
dataIndex: this.entityColumnDataIndex,
flex: 3,
editor: this.getEntityEditor(),
renderer: this.renderEntityName
}, {
header: 'Identifier',
dataIndex: this.identifierColumnDataIndex,
flex: 5,
editor: this.getIdentifierEditor(),
renderer: this.renderIdentifier
}
]
},
getEntityEditor: function () {
return {
xtype: 'combo',
store: this.entityStore,
displayField: 'name',
valueField: 'id',
listeners: {
select: Ext.bind(this.bindIdentifierStoreOnChange, this)
}
};
},
getIdentifierEditor: function () {
this.identifierEditor = Ext.create('Ext.form.field.ComboBox', {
displayField: 'name',
valueField: 'id',
delimiter: this.identifierDelimiter,
multiSelect: true,
allowBlank: true,
getSubmitData: function () {
return this.getModelData();
},
getParams: function (queryString) {
var params = {},
param = this.queryParam;
if (param) {
params[param] = queryString;
params[param] = queryString;
}
return params;
}
});
return this.identifierEditor;
},
createEntityStore: function () {
return Ext.create('Ext.data.Store', {
fields: this.getChangeFrequencyFields(),
data: this.getEntityStoreData(),
allowBlank: false,
sorters: [
{
property: 'name'
}
]
});
},
getChangeFrequencyFields: function () {
return [
{ name: 'id', type: 'string' },
{ name: 'name', type: 'string' },
];
},
getEntityStoreData: function () {
var entityStoreData = [],
entity;
for (entity in this.availableStores) {
if (!this.availableStores.hasOwnProperty(entity) || !this.isEntityAllowed(entity)) {
continue;
}
entityStoreData.push({ 'id': entity, 'name': this.availableStores[entity].translation });
}
return entityStoreData;
},
createSelectionModel: function() {
var me = this;
return Ext.create('Ext.selection.CheckboxModel', {
listeners: {
selectionchange: function (selectionModel, selections) {
me.deleteButton.setDisabled(selections.length === 0);
}
},
editRenderer: null
});
},
renderEntityName: function (entity) {
return this.entityStore.findRecord('id', entity).get('name');
},
createNewEntry: function () {
var newModel = Ext.create(this.store.model),
entityName = this.getFirstPossibleEntityName();
newModel.set(this.entityColumnDataIndex, entityName);
newModel.set(this.identifierColumnDataIndex, null);
this.store.add(newModel);
},
deleteSelectedRecords: function () {
var selectionModel = this.selModel,
records = selectionModel.getSelection();
if (records.length > 0) {
this.store.remove(records);
}
},
getFirstPossibleEntityName: function () {
if (!this.allowedEntities.length) {
return Object.keys(this.availableStores)[0];
}
return this.allowedEntities[0];
},
renderIdentifier: function (value, colMetaData, record) {
if (!value) {
return 'Alle';
}
var entity = record.get(this.entityColumnDataIndex),
identifier = record.get(this.identifierColumnDataIndex),
store = this.savedStores[entity][identifier],
names = [];
if (!store) {
return value;
}
store.each(function (item) {
names.push(item.get('name'));
});
return names.join(this.identifierDelimiter);
},
getStoreForEntity: function (entity) {
var storeConfiguration = this.availableStores[entity].storeConfiguration;
return Ext.create('Shopware.store.Search', {
model: storeConfiguration.model,
configure: function () {
return { entity: storeConfiguration.entity };
}
});
},
loadStoreByValues: function (entity, identifiers, callback) {
var store = this.getStoreForEntity(entity),
identifierArray,
params = {};
callback = callback || function () {};
if (identifiers === null) {
return;
}
identifierArray = identifiers.split(this.identifierDelimiter);
params.ids = Ext.JSON.encode(identifierArray);
if (!Array.isArray(identifierArray)) {
params.id = identifiers;
}
store.load({
params: params,
callback: callback
});
this.saveStore(entity, identifiers, store);
},
loadStores: function (grid) {
var me = this;
grid.getStore().each(function (record) {
var entity = record.get(me.entityColumnDataIndex),
identifiers = record.get(me.identifierColumnDataIndex);
me.loadStoreByValues(entity, identifiers);
});
},
saveStore: function (entity, identifiers, store) {
if (!this.savedStores.hasOwnProperty('entity')) {
this.savedStores[entity] = {};
}
this.savedStores[entity][identifiers] = store;
},
changeStoreBeforeEdit: function (record) {
var me = this,
entityStore = this.getStoreForEntity(record.get(this.entityColumnDataIndex));
entityStore.load(function () {
me.identifierEditor.bindStore(entityStore);
var identifierEditorValue = me.identifierEditor.getValue();
if (!identifierEditorValue.length) {
return;
}
identifierEditorValue = identifierEditorValue[0].split(me.identifierDelimiter);
identifierEditorValue = identifierEditorValue.map(function (element) { return parseInt(element); });
me.identifierEditor.setValue(identifierEditorValue, true);
});
},
loadStoresAfterEdit: function (editor, options) {
var me = this,
identifierValue = options.newValues[this.identifierColumnDataIndex];
if (!Array.isArray(identifierValue) || identifierValue === null) {
return;
}
if (!identifierValue.length) {
return;
}
identifierValue = identifierValue.join(me.delimiter);
me.loadStoreByValues(
options.newValues[this.entityColumnDataIndex],
identifierValue,
function () {
me.getView().refresh();
}
);
},
bindIdentifierStoreOnChange: function (combo, records) {
var entity = records[0].get('id'),
entityStore = this.getStoreForEntity(entity);
entityStore.load();
this.identifierEditor.setValue(null);
this.identifierEditor.bindStore(entityStore);
},
isEntityAllowed: function (entity) {
if (!this.allowedEntities.length) {
return true;
}
return this.allowedEntities.includes(entity);
},
});
Ext.define('Shopware.form.field.ColorField', {
extend: 'Ext.form.FieldContainer',
alias: 'widget.shopware-color-picker',
layout: {
type: 'hbox'
},
pickerButton: true,
editable: true,
initComponent: function () {
var me = this;
me.items = me.createItems();
if (me.value) {
me.inputField.setValue(me.value);
me.valueChanged(me.value);
}
me.inputField.on('change', function(field, newValue) {
me.valueChanged(newValue);
});
me.callParent(arguments);
},
afterRender: function() {
var me = this;
me.callParent(arguments);
if (me.helpText) {
me.createHelp();
me.helpIconEl.dom.style.marginLeft = '5px';
}
if (me.supportText) {
me.createSupport()
}
},
createItems: function() {
var me = this, items = [];
me.inputField = me.createInputField();
me.colorField = me.createColorField();
items.push(me.inputField);
items.push(me.colorField);
if (me.pickerButton == true) {
me.pickerButton = me.createPickerButton();
items.push(me.pickerButton);
}
return items;
},
createPickerButton: function() {
var me = this;
return Ext.create('Ext.button.Button', {
iconCls: 'sprite-color--pencil',
handler: function() {
me.colorWindow = Ext.create('Shopware.color.Window', {
modal: true,
value: me.getValue()
}).show();
me.colorWindow.on('apply-color', function(win, value) {
win.destroy();
me.setValue(value);
});
}
});
},
createInputField: function () {
var me = this;
return Ext.create('Ext.form.field.Text', {
name: me.name,
flex: 1,
readOnly: !me.editable
});
},
createColorField: function () {
return Ext.create('Ext.form.field.Text', {
width: 30,
readOnly: true
});
},
getValue: function () {
return this.inputField.getValue();
},
setValue: function (value) {
var color = '#fff';
if (value) {
color = value;
}
this.valueChanged(color);
return this.inputField.setValue(value)
},
getSubmitData: function () {
return this.inputField.getSubmitData();
},
valueChanged: function(value) {
this.colorField.setFieldStyle('background: ' + value);
},
validate: function() {
return this.inputField.validate();
},
getName: function() {
return this.inputField.getName();
},
createHelp: function () {
var me = this,
helpIcon = new Ext.Element(document.createElement('span')),
row = new Ext.Element(document.createElement('td'));
row.set({ width: 24, valign: 'top' });
helpIcon.set({ cls: Ext.baseCSSPrefix + 'form-help-icon' });
helpIcon.appendTo(row);
Ext.tip.QuickTipManager.register({
target: helpIcon,
cls: Ext.baseCSSPrefix + 'form-tooltip',
title: (me.helpTitle) ? me.helpTitle : '',
text: me.helpText,
width: (me.helpWidth) ? me.helpWidth : 225,
anchorToTarget: true,
anchor: 'right',
anchorSize: {
width: 24,
height: 24
},
defaultAlign: 'tr',
showDelay: me.helpTooltipDelay,
dismissDelay: me.helpTooltipDismissDelay
});
row.appendTo(this.inputRow);
this.helpIconEl = helpIcon;
return helpIcon;
},
createSupport: function () {
var me = this,
row = new Ext.Element(document.createElement('tr')),
fillCell = new Ext.Element(document.createElement('td')),
cell = new Ext.Element(document.createElement('td')),
supportText = new Ext.Element(document.createElement('div'));
supportText.set({
cls: Ext.baseCSSPrefix +'form-support-text'
});
if(me.supportText) {
supportText.update(me.supportText);
}
supportText.appendTo(cell);
var element = me.getEl().select('tbody');
if(element.elements.length > 1) {
element = element.elements[0];
}
if(me.fieldLabel || !me.hideEmptyLabel) {
fillCell.appendTo(row);
}
cell.appendTo(row);
if(me.helpText) {
var tmpCell = new Ext.Element(document.createElement('td'));
tmpCell.appendTo(row);
}
row.appendTo(element);
me.supportTextEl = supportText;
return supportText;
}
});
Ext.define('Shopware.form.field.ColorSelection', {
extend: 'Ext.container.Container',
imageSrc: 'data:image/png;base64,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',
initComponent: function() {
var me = this;
me.callParent(arguments);
me.on('afterrender', function() {
me.createCanvasElement();
});
},
rgbToHex: function (r, g, b) {
var me = this;
return me.toHex(r) + me.toHex(g) + me.toHex(b);
},
toHex: function (N) {
if (N == null) {
return "00";
}
N = parseInt(N);
if (N == 0 || isNaN(N)) {
return "00";
}
N = Math.max(0, N);
N = Math.min(N, 255);
N = Math.round(N);
return "0123456789ABCDEF".charAt((N - N % 16) / 16)
+ "0123456789ABCDEF".charAt(N % 16);
},
createPicker: function (canvas) {
var me = this,
ctx = canvas.getContext('2d'),
img = new Image(),
$canvas = Ext.get(canvas),
mouseDown = false;
img.src = me.imageSrc;
img.onload = function () {
ctx.drawImage(img, 0, 0);
};
$canvas.addListener('mousedown', function (event) {
mouseDown = event.button === 0;
});
$canvas.addListener('mouseup', function () {
mouseDown = false;
});
$canvas.addListener('mousemove', function (event) {
if (mouseDown) {
me.selectColor(event, ctx);
}
});
$canvas.addListener('click', function (event) {
me.selectColor(event, ctx);
});
},
selectColor: function(event, ctx) {
var me = this,
bEvent = event.browserEvent,
x = (typeof bEvent.offsetX !== 'undefined') ? bEvent.offsetX : bEvent.layerX,
y = (typeof bEvent.offsetY !== 'undefined') ? bEvent.offsetY: bEvent.layerY,
imageData = ctx.getImageData(x, y, 1, 1),
data = imageData.data;
var value = '#' + me.rgbToHex(data[0], data[1], data[2]);
me.fireEvent('color-changed', me, value);
},
createCanvasElement: function () {
var me = this,
spec = {
tag: 'canvas',
id: 'color-picker-canvas-' + Ext.id(),
width: 371,
height: 371,
style: 'cursor: default !important;'
}, canvas;
canvas = Ext.DomHelper.append(me.getEl().dom, spec);
me.createPicker(canvas);
}
});
Ext.define('Shopware.color.Window', {
extend: 'Enlight.app.SubWindow',
title: 'Farbauswahl',
width: 377,
height: 490,
layout: {
type: 'vbox',
align: 'stretch'
},
resizable: false,
maximizable: false,
minimizable: false,
closable: false,
initComponent: function () {
var me = this;
me.items = me.createItems();
me.dockedItems = me.createDockedItems();
me.callParent(arguments);
},
createItems: function () {
var me = this;
me.formPanel = Ext.create('Ext.form.Panel', {
flex: 1,
items: [
me.createColorSelection(),
me.createSelectedColorField()
]
});
return [
me.formPanel
];
},
createColorSelection: function() {
var me = this;
me.colorSelection = Ext.create('Shopware.form.field.ColorSelection', {
parentWindow: me
});
me.colorSelection.on('color-changed', function(window, value) {
me.selectedColorField.setValue(value);
});
return me.colorSelection;
},
createSelectedColorField: function() {
var me = this;
me.selectedColorField = Ext.create('Shopware.form.field.ColorField', {
pickerButton: false,
editable: false,
value: me.value,
fieldLabel: 'Ausgewählt',
margin: 10
});
return me.selectedColorField;
},
createDockedItems: function () {
var me = this;
return [ me.createToolbar() ];
},
createToolbar: function () {
var me = this;
me.toolbar = Ext.create('Ext.toolbar.Toolbar', {
dock: 'bottom',
items: me.createToolbarItems()
});
return me.toolbar;
},
createToolbarItems: function () {
var me = this;
return [
'->',
me.createCancelButton(),
me.createApplyButton()
];
},
createCancelButton: function () {
var me = this;
me.cancelButton = Ext.create('Ext.button.Button', {
text: 'Abbrechen',
cls: 'small',
handler: function () {
me.destroy();
}
});
return me.cancelButton;
},
createApplyButton: function () {
var me = this;
me.applyButton = Ext.create('Ext.button.Button', {
text: 'Übernehmen',
cls: 'primary small',
handler: function () {
me.fireEvent('apply-color', me, me.selectedColorField.getValue());
}
});
return me.applyButton;
}
});
Ext.define('Ext.ux.ButtonColumnMenuItem', {
extend: 'Ext.menu.Item',
setState: function (state) {
this.state = state;
},
onClick: function (e) {
var me = this;
if (!me.href) {
e.stopEvent();
}
if (me.disabled) {
return;
}
if (me.hideOnClick) {
me.deferHideParentMenusTimer = Ext.defer(me.deferHideParentMenus, me.clickHideDelay, me);
}
Ext.callback(me.handler, me.scope || me, [me, me.state, e]);
me.fireEvent('click', me, e);
if (!me.hideOnClick) {
me.focus();
}
}
});
Ext.define('Ext.ux.ButtonColumn', {
extend: 'Ext.grid.column.Column',
alias: ['widget.buttoncolumn'],
requires: ['Ext.button.Button'],
header: '&#160;',
menuAlign: 'tl-bl?',
extMinor: Ext.getVersion().getMinor(),
sortable: false,
baseCls: Ext.baseCSSPrefix + 'btn',
arrowAlign: 'right',
arrowCls: 'split',
textAlign: 'center',
btnRe: new RegExp(Ext.baseCSSPrefix + 'btn'),
triggerRe: new RegExp(Ext.baseCSSPrefix + 'btn-split'),
constructor: function (config) {
var me = this,
cfg = Ext.apply({}, config),
items = cfg.items;
delete cfg.items;
me.callParent([cfg]);
if (items || me.setupMenu) {
this.menu = Ext.create('Ext.menu.Menu');
me.split = true;
if (items) {
var i, l = items.length
for (i = 0; i < l; i++) {
this.menu.add(new Ext.ux.ButtonColumnMenuItem(items[i]));
}
}
}
me.initBtnTpl();
me.renderer = function (v, meta, record) {
var data = {};
data.tooltip = me.tooltip ? Ext.String.format('data-qtip="{0}"', me.tooltip) : '';
data.iconCls = Ext.isFunction(me.getClass) ? me.getClass.apply(me, arguments) : (me.iconCls || 'x-hide-display');
data.iconClsBtn = data.iconCls === 'x-hide-display' ? me.getBtnGroupCls('noicon').join(' ') : me.getBtnGroupCls('icon-text-left').join(' ');
data.disabledCls = me.isDisabledFn && me.isDisabledFn.apply(me,
arguments) ? me.disabledCls + ' ' + me.getBtnGroupCls('disabled').join(' ') : '';
v = Ext.isFunction(cfg.renderer) ? cfg.renderer.apply(this, arguments) : v;
data.text = Ext.isEmpty(v) ? me.buttonText || '&#160;': v;
Ext.applyIf(data, me.getTemplateArgs());
return me.btnTpl.apply(data);
};
},
getTemplateArgs: function () {
var me = this;
return {
id: Ext.id(),
href: false,
type: 'button',
glyph: '',
iconUrl: '',
baseCls: me.baseCls,
splitCls: me.getSplitCls(),
btnCls: me.extMinor === 1 ? me.getBtnCls() :''
};
},
initBtnTpl: function () {
var me = this,
mainDivStr = '<div class="x-btn x-btn-default-small {iconClsBtn} {disabledCls}" {tooltip}>{0}</div>',
btnFrameTpl = '<TABLE  class="x-table-plain" cellPadding=0><TBODY><TR>' +
'<TD'+ (me.extMinor != 2 ? ' style="PADDING-LEFT: 3px; BACKGROUND-POSITION: 0px -6px"' : '') + ' class="x-frame-tl x-btn-tl x-btn-default-small-tl" role=presentation></TD>' +
'<TD'+ (me.extMinor != 2 ? ' style="BACKGROUND-POSITION: 0px 0px; HEIGHT: 3px"' : '')  + ' class="x-frame-tc x-btn-tc x-btn-default-small-tc" role=presentation></TD>' +
'<TD'+ (me.extMinor != 2 ? ' style="PADDING-LEFT: 3px; BACKGROUND-POSITION: right -9px"' : '')  + ' class="x-frame-tr x-btn-tr x-btn-default-small-tr" role=presentation></TD>' +
'</TR><TR>' +
'<TD'+ (me.extMinor != 2 ? ' style="PADDING-LEFT: 3px; BACKGROUND-POSITION: 0px 0px"' : '')  + ' class="x-frame-ml x-btn-ml x-btn-default-small-ml" role=presentation></TD>' +
'<TD'+ (me.extMinor != 2 ? ' style="BACKGROUND-POSITION: 0px 0px"' : '')  + ' class="x-frame-mc x-btn-mc x-btn-default-small-mc" role=presentation>' +
'{0}' +
'</TD>' +
'<TD'+ (me.extMinor != 2 ? ' style="PADDING-LEFT: 3px; BACKGROUND-POSITION: right 0px"' : '')  + ' class="x-frame-mr x-btn-mr x-btn-default-small-mr" role=presentation></TD>' +
'</TR><TR>' +
'<TD'+ (me.extMinor != 2 ? ' style="PADDING-LEFT: 3px; BACKGROUND-POSITION: 0px -12px"' : '')  + ' class="x-frame-bl x-btn-bl x-btn-default-small-bl" role=presentation></TD>' +
'<TD'+ (me.extMinor != 2 ? ' style="BACKGROUND-POSITION: 0px -3px; HEIGHT: 3px"' : '')  + ' class="x-frame-bc x-btn-bc x-btn-default-small-bc" role=presentation></TD>' +
'<TD'+ (me.extMinor != 2 ? ' style="PADDING-LEFT: 3px; BACKGROUND-POSITION: right -15px"' : '')  + ' class="x-frame-br x-btn-br x-btn-default-small-br" role=presentation></TD>' +
'</TR></TBODY></TABLE>'
if (Ext.supports.CSS3BorderRadius) {
me.btnTpl = Ext.create('Ext.XTemplate', Ext.String.format(mainDivStr, me.btnTpl))
} else {
me.btnTpl = Ext.create('Ext.XTemplate', Ext.String.format(Ext.String.format(mainDivStr, btnFrameTpl), me.btnTpl));
}
},
getBtnGroupCls: function (suffix) {
var cls = ['', 'btn-', 'btn-default-', 'btn-default-small-'],
i, l;
for (i = 0, l = cls.length; i < l; i++) {
cls[i] = Ext.baseCSSPrefix + cls[i] + suffix;
}
return cls;
},
showMenu: function (el) {
var me = this;
if (me.rendered && me.menu) {
if (me.menu.isVisible()) {
me.menu.hide();
}
me.menu.showBy(el, me.menuAlign);
}
return me;
},
destroy: function () {
delete this.items;
delete this.renderer;
Ext.destroy(this.menu);
return this.callParent(arguments);
},
processEvent: function (type, view, cell, recordIndex, cellIndex, e) {
var me = this,
target = e.getTarget();
btnMatch = target.className.match(me.btnRe) || target.localName == 'button' || target.nodeName == 'BUTTON',
triggerMatch = target.className.match(me.triggerRe);
if(me.extMinor === 2 && !view.mouseOverOutBuffer){
view.mouseOverItem = undefined;
}
if (btnMatch) {
var btnEl = Ext.fly(cell).down('div.x-btn');
if (btnEl.hasCls(me.disabledCls)) {
return me.stopSelection !== true;
}
if (type == 'click') {
btnEl.removeCls(me.getBtnGroupCls('over'));
if (triggerMatch) {
var record = view.getStore().getAt(recordIndex),
menuItems,
menu = me.menu;
if (me.setupMenu) {
menuItems = me.setupMenu.call(me.setupMenuScope || me, record, recordIndex);
menu.removeAll(true);
var i, l = menuItems.length;
for (i = 0; i < l; i++) {
menu.add(menuItems[i]);
}
} else {
menuItems = menu.items;
menuItems.each(function (item) {
item.setState({
view: view,
record: record,
rowIndex: recordIndex
});
}, me);
}
me.showMenu(btnEl);
} else {
if (me.handler) {
me.handler.call(me.scope || me, view, recordIndex, cellIndex, e);
}
}
} else if (type == 'mouseover' && (me.extMinor !== 2 || (me.extMinor === 2 && !view.mouseOverOutBuffer))) {
if(!me.menu || !me.menu.isVisible()){
btnEl.addCls(me.getBtnGroupCls('over'));
}
} else if (type == 'mouseout' && (me.extMinor !== 2 || (me.extMinor === 2 && !view.mouseOverOutBuffer))) {
btnEl.removeCls(me.getBtnGroupCls('over'));
}
else if (type == 'mousedown') {
btnEl.addCls(me.getBtnGroupCls('pressed'));
return me.stopSelection !== true;
} else if (type == 'mouseup') {
btnEl.removeCls(me.getBtnGroupCls('pressed'));
}
}
return me.callParent(arguments);
},
cascade: function (fn, scope) {
fn.call(scope || this, this);
},
getRefItems: function (deep) {
var menu = this.menu,
items;
if (menu) {
items = menu.getRefItems(deep);
items.unshift(menu);
}
return items || [];
}
}, function() {
var buttonPrototype = Ext.button.Button.prototype;
this.prototype.btnTpl = Ext.isArray(buttonPrototype.renderTpl) ? buttonPrototype.renderTpl.join('') : buttonPrototype.renderTpl;
this.prototype.getSplitCls = buttonPrototype.getSplitCls;
this.prototype.getBtnCls= buttonPrototype.getBtnCls;
});
Ext.define('Shopware.window.SimpleModule', {
extend: 'Enlight.app.Window',
height: '90%',
width: '80%',
layout: 'fit'
});
Ext.define('Shopware.apps.Base.view.element.Boolean', {
extend: 'Ext.form.field.Checkbox',
alias: [
'widget.base-element-boolean',
'widget.base-element-checkbox',
'widget.config-element-boolean',
'widget.config-element-checkbox'
],
inputValue: true,
uncheckedValue: false,
initComponent: function () {
var me = this;
if(me.value) {
me.setValue(!!me.value);
}
if(me.supportText) {
me.boxLabel = me.supportText;
delete me.supportText;
} else if(me.helpText) {
me.boxLabel = me.helpText;
delete me.helpText;
}
me.callParent(arguments);
}
});
Ext.define('Shopware.apps.Base.view.element.BooleanSelect', {
extend: 'Ext.form.field.ComboBox',
alias: [
'widget.base-element-boolean-select',
'widget.config-element-boolean-select'
],
queryMode: 'local',
forceSelection: true,
editable: false,
store: [
["", 'Inherited'],
[true, 'Yes'],
[false, 'No']
]
});
Ext.define('Shopware.apps.Base.view.element.Button', {
extend: 'Ext.button.Button',
alias: [
'widget.base-element-button',
'widget.base-element-controllerbutton',
'widget.config-element-button',
'widget.config-element-controllerbutton'
],
initComponent: function () {
var me = this;
if (me.controller) {
me.handler = function() {
window.openAction(me.controller);
}
} else if (typeof me.handler === 'string' && me.handler.indexOf('function') !== -1) {
eval('me.handler =' + me.handler + ';');
}
me.disabled = false;
if(me.fieldLabel) {
me.text = me.fieldLabel;
delete me.fieldLabel;
}
me.callParent(arguments);
}
});
Ext.define('Shopware.apps.Base.view.element.Color', {
extend: 'Ext.form.TriggerField',
alias: [
'widget.base-element-color',
'widget.config-element-color'
],
triggerConfig: {
src: Ext.BLANK_IMAGE_URL,
tag: "img",
cls: "x-form-trigger x-form-color-trigger"
},
regex: /^#([0-9A-F]{6}|[0-9A-F]{3})$/i,
initComponent: function () {
this.callParent()
this.addEvents('select');
this.on('change', function (c, v) {
this.onSelect(c, v);
}, this);
},
onDestroy: function () {
Ext.destroy(this.menu);
this.callParent();
},
afterRender: function () {
this.callParent(arguments)
this.inputEl.setStyle('background', this.value);
this.detectFontColor();
},
onTriggerClick: function (e) {
if (this.disabled) {
return;
}
this.menu = new Ext.ux.ColorPicker({
shadow: true,
autoShow: true,
hideOnClick: false
});
this.menu.alignTo(this.inputEl, 'tl-bl?');
this.menuEvents('on');
this.menu.show(this.inputEl);
},
menuEvents: function (method) {
this.menu[method]('select', this.onSelect, this);
this.menu[method]('hide', this.onMenuHide, this);
this.menu[method]('show', this.onFocus, this);
},
onSelect: function (m, d) {
d = Ext.isString(d) && d.substr(0, 1) != '#' ? '#' + d : d;
this.setValue(d);
this.fireEvent('select', this, d);
this.inputEl.setStyle('background', d);
this.detectFontColor();
},
detectFontColor: function () {
var value = this.value;
if (!this.menu || !this.menu.picker.rawValue) {
if (!value) {
value = '#FFF';
}
if (value.length < 6) {
value = value + value.slice(1, 5);
};
var h2d = function (d) {
return parseInt(d, 16);
}
value = [
h2d(value.slice(1, 3)),
h2d(value.slice(3, 5)),
h2d(value.slice(5))
];
} else {
value = this.menu.picker.rawValue;
}
var avg = (value[0] + value[1] + value[2]) / 3;
this.inputEl.setStyle('color', (isNaN(avg) || avg > 128) ? '#000' : '#FFF');
},
onMenuHide: function () {
this.focus(false, 60);
this.menuEvents('un');
}
});
Ext.define('Ext.ux.ColorPicker', {
extend: 'Ext.menu.ColorPicker',
initComponent: function () {
var me = this;
me.height = 100;
me.hideOnClick = true;
me.callParent();
return me.processEvent();
},
processEvent: function () {
return;
var me = this;
me.picker.clearListeners();
me.relayEvents(me.picker, ['select']);
if (me.hideOnClick) {
me.on('select', me.hidePickerOnSelect, me);
}
}
});
Ext.define('Shopware.apps.Base.view.element.Date', {
extend: 'Ext.form.field.Date',
alias: [
'widget.base-element-date',
'widget.base-element-datefield',
'widget.config-element-date',
'widget.config-element-datefield'
],
setValue: function(value) {
this.callParent([this.formatValue(value)]);
},
formatValue: function(value) {
if(!value) {
return null;
} else if (typeof value === 'string') {
return (value === "0000-00-00") ? null : new Date(value);
} else {
return value;
}
}
});
Ext.define('Shopware.apps.Base.view.element.DateTime', {
extend: 'Ext.form.FieldContainer',
alias: [
'widget.base-element-datetime',
'widget.config-element-datetime'
],
mixins: {
field: 'Ext.form.field.Field'
},
layout: 'fit',
timePosition: 'right', // valid values:'below', 'right'
dateCfg: {},
timeCfg: {},
allowBlank: true,
initComponent: function() {
var me = this;
me.value = me.formatValue(me.value);
me.buildField();
me.callParent();
me.dateField = me.down('datefield');
me.timeField = me.down('timefield');
me.initField();
},
formatValue: function(value) {
if(!value) {
return null;
} else if (typeof value === 'string') {
value = value.replace(' ', 'T');
value += '+00:00';
value = new Date(value);
return new Date((value.getTime() + (value.getTimezoneOffset() * 60 * 1000)));
} else {
return value;
}
},
buildField: function() {
var me = this,
l,
d;
if (me.timePosition == 'below') {
l = { type: 'anchor' };
d = { anchor: '100%' };
} else {
l = { type: 'hbox', align: 'middle' };
d = { flex: 1 };
}
this.items = {
xtype: 'container',
layout: l,
defaults: d,
items: [Ext.apply({
xtype: 'datefield',
disabled: me.disabled,
readOnly: me.readOnly,
value: me.value,
width: me.timePosition != 'below' ? 100 : undefined,
allowBlank: me.allowBlank,
listeners: {
specialkey: me.onSpecialKey,
scope: me
},
isFormField: false // prevent submission
}, me.dateCfg), Ext.apply({
xtype: 'timefield',
submitFormat: 'H:i:s',
disabled: me.disabled,
readOnly: me.readOnly,
value: me.value,
margin: me.timePosition != 'below' ? '0 0 0 3' : 0,
width: me.timePosition != 'below' ? 80 : undefined,
allowBlank: me.allowBlank,
listeners: {
specialkey: me.onSpecialKey,
scope: me
},
isFormField: false // prevent submission
}, me.timeCfg)]
};
},
focus: function() {
this.callParent();
this.dateField.focus(false, 100);
},
onSpecialKey: function(cmp, e) {
var key = e.getKey();
if (key === e.TAB) {
if (cmp == this.dateField) {
if (e.shiftKey) {
this.fireEvent('specialkey', this, e);
}
}
if (cmp == this.timeField) {
if (!e.shiftKey) {
this.fireEvent('specialkey', this, e);
}
}
} else if (this.inEditor) {
this.fireEvent('specialkey', this, e);
}
},
getValue: function() {
var value, date = this.dateField.getSubmitValue(), time = this.timeField.getSubmitValue();
if (date) {
if (time) {
var format = this.getFormat();
value = Ext.Date.parse(date + ' ' + time, format);
} else {
value = this.dateField.getValue();
}
}
return value
},
setValue: function(value) {
value = this.formatValue(value);
if (value !== null && !isNaN(value)) {
this.dateField.setValue(value);
this.timeField.setValue(value);
} else if (value === null) {
this.reset();
}
},
getSubmitData: function() {
var value = this.getValue();
var format = this.getFormat();
var result = { };
result[this.name]  = value ? Ext.Date.format(value, format) : null;
return result;
},
getFormat: function() {
return (this.dateField.submitFormat || this.dateField.format) + " " + (this.timeField.submitFormat || this.timeField.format)
},
getErrors: function() {
return this.dateField.getErrors().concat(this.timeField.getErrors());
},
validate: function() {
if (this.disabled)
return true;
else {
var isDateValid = this.dateField.validate();
var isTimeValid = this.timeField.validate();
return isDateValid && isTimeValid;
}
},
reset: function() {
this.mixins.field.reset();
this.dateField.reset();
this.timeField.reset();
}
});
Ext.define('Shopware.apps.Base.view.element.Fieldset', {
extend: 'Ext.panel.Panel',
alias: [
'widget.base-element-fieldset',
'widget.config-element-fieldset'
],
bodyPadding: 10,
border: false,
layout: 'form',
defaults: {
anchor: '100%',
labelWidth: 250,
hideEmptyLabel: false
},
initComponent: function () {
var me = this;
me.callParent(arguments);
}
});
Ext.define('Shopware.apps.Base.view.element.Html', {
extend: 'Ext.form.field.HtmlEditor',
alias: [
'widget.base-element-html',
'widget.base-element-htmleditor',
'widget.config-element-html',
'widget.config-element-htmleditor'
]
});
Ext.define('Shopware.apps.Base.view.element.Interval', {
extend: 'Ext.form.field.ComboBox',
alias: [
'widget.base-element-interval',
'widget.config-element-interval'
],
queryMode: 'local',
forceSelection: false,
editable: true,
store: [
[0, 'Kein (0 Sek.)'],
[120, '2 Minuten (120 Sek.)'],
[300, '5 Minuten (300 Sek.)'],
[600, '10 Minuten (600 Sek.)'],
[900, '15 Minuten (900 Sek.)'],
[1800, '30 Minuten (1800 Sek.)'],
[3600, '1 Stunde (3600 Sek.)'],
[7200, '2 Stunden (7200 Sek.)'],
[14400, '4 Stunden (14400 Sek.)'],
[28800, '8 Stunden (28800 Sek.)'],
[43200, '12 Stunden (43200 Sek.)'],
[86400, '1 Tag (86400 Sek.)'],
[172800, '2 Tage (172800 Sek.)'],
[604800, '1 Woche (604800 Sek.)']
],
initComponent: function () {
var me = this;
me.callParent(arguments);
}
});
Ext.define('Shopware.apps.Base.view.element.Number', {
extend: 'Ext.form.field.Number',
alias: [
'widget.base-element-number',
'widget.base-element-numberfield',
'widget.config-element-number',
'widget.config-element-numberfield'
],
submitLocaleSeparator: false
});
Ext.define('Shopware.apps.Base.view.element.Select', {
extend: 'Ext.form.field.ComboBox',
alias: [
'widget.base-element-select',
'widget.base-element-combo',
'widget.base-element-combobox',
'widget.base-element-comboremote',
'widget.config-element-select',
'widget.config-element-combo',
'widget.config-element-combobox',
'widget.config-element-comboremote'
],
queryMode: 'local',
forceSelection: false,
editable: true,
valueField: 'id',
displayField: 'name',
isCustomStore: false,
initComponent: function () {
var me = this;
if (me.controller && me.action) {
me.store = new Ext.data.Store({
url: '/stageware12/backend/' + me.controller + '/' + me.action,
autoLoad: true,
remoteFilter: true,
reader: new Ext.data.JsonReader({
root: me.root || 'data',
totalProperty: me.count || 'total',
fields: me.fields
})
});
me.valueField = me.displayField;
}
if (typeof me.store === 'string' && me.store.indexOf('new ') !== -1) {
eval('me.store = ' + me.store + ';');
if(!me.isCustomStore) {
me.valueField = me.displayField;
}
} else if (typeof me.store === 'string' && me.store.substring(0, 5) !== 'base.') {
me.store = me.getStoreById(me.store);
}
if (me.store instanceof Ext.data.Store && me.filter) {
me.store.clearFilter(true);
me.store.filter(me.filter);
}
me.callParent(arguments);
},
setValue: function (value) {
var me = this;
if (value !== null && !me.store.loading && me.store.getCount() == 0) {
me.store.load({
callback: function () {
if(me.store.getCount() > 0) {
me.setValue(value);
} else {
me.setValue(null);
}
}
});
return;
}
me.callParent(arguments);
},
getStoreById: function(storeId) {
var configSelectStoreId = 'Shopware.apps.Base.view.element.Select.store.' + storeId;
if (this.filter) {
configSelectStoreId += '.filter.' + JSON.stringify(this.filter);
}
var store = Ext.data.StoreManager.lookup(configSelectStoreId);
if (store) {
return store;
}
try {
store = Ext.create(storeId, {
storeId: configSelectStoreId,
pageSize: 1000
});
Ext.override(store, {
load: function () {
if (!this.loadCalled) {
this.loadCalled = true;
this.callParent(arguments);
} else {
this.fireEvent('load', this)
}
}
});
return store;
} catch (e) {
return null;
}
}
});
Ext.define('Shopware.apps.Base.view.element.SelectTree', {
extend: 'Shopware.form.field.ComboTree',
alias: [
'widget.base-element-selecttree',
'widget.base-element-combotree',
'widget.config-element-selecttree',
'widget.config-element-combotree'
],
queryMode: 'local',
forceSelection: false,
editable: true,
valueField: 'id',
displayField: 'name',
initComponent: function () {
var me = this;
if(me.store) {
me.store = Ext.data.StoreManager.lookup(me.store)
}
me.callParent(arguments);
},
setValue: function (value) {
var me = this,
store = me.store;
if (value && !store.loading
&& (!store.getCount() || !store.getNodeById(me.value))) {
store.load({
filters: [{
property: 'id',
value: value
}]
});
}
me.callParent(arguments);
},
onStoreHasLoaded: function(store) {
var me = this;
me.callParent(arguments);
if(store.filters && store.filters.getCount()) {
store.load();
}
}
});
Ext.define('Shopware.apps.Base.view.element.Text', {
extend: 'Ext.form.field.Text',
alias: [
'widget.base-element-text',
'widget.base-element-textfield',
'widget.config-element-text',
'widget.config-element-textfield'
]
});
Ext.define('Shopware.apps.Base.view.element.TextArea', {
extend: 'Ext.form.field.TextArea',
alias: [
'widget.base-element-textarea',
'widget.config-element-textarea'
],
grow: true
});
Ext.define('Shopware.apps.Base.view.element.Time', {
extend: 'Ext.form.field.Time',
alias: [
'widget.base-element-time',
'widget.base-element-timefield',
'widget.config-element-time',
'widget.config-element-timefield'
]
});
Ext.define('Shopware.apps.Base.view.element.MediaSelection', {
extend: 'Shopware.MediaManager.MediaSelection',
alias: [
'widget.base-element-media',
'widget.base-element-mediaselection',
'widget.base-element-mediafield',
'widget.base-element-mediaselectionfield',
'widget.config-element-media',
'widget.config-element-mediaselection'
]
});
Ext.define('Shopware.apps.Base.view.element.ProductBoxLayoutSelect', {
extend: 'Ext.form.field.ComboBox',
fieldLabel: 'Produkt Layout',
helpText: 'Mit Hilfe des Produkt Layouts kannst Du entscheiden, wie Deine Produkte auf der Kategorie-Seite dargestellt werden sollen. Wähle eines der drei unterschiedlichen Layouts um die Ansicht perfekt auf dein Produktsortiment abzustimmen. Du kannst für jede Kategorie ein eigenes Layout wählen oder über die Vererbungsfunktion automatisch die Einstellungen der Eltern-Kategorie übernehmen.',
labelWidth: 180,
queryMode: 'local',
valueField: 'key',
displayField: 'label',
alias: [
'widget.base-element-product-box-layout-select',
'widget.config-element-product-box-layout-select'
],
editable: false,
storeConfig: {},
listConfig: {
getInnerTpl: function () {
return '' +
'<div class="layout-select-item">' +
'<img src="{image}" width="70" height="50" class="layout-picto" />' +
'<div class="layout-info">' +
'<h1>{label}</h1>' +
'<div>{description}</div>' +
'</div>' +
'<div class="x-clear" />' +
'</div>' +
'';
}
},
initComponent: function() {
this.queryMode = 'local';
this.createStore();
this.callParent(arguments);
},
createStore: function() {
this.store = Ext.create('Shopware.apps.Base.store.ProductBoxLayout', this.storeConfig);
}
});
Ext.define('Shopware.apps.Base.view.element.ListingFilterModeSelect', {
extend: 'Shopware.apps.Base.view.element.ProductBoxLayoutSelect',
labelWidth: 180,
alias: 'widget.base-element-listing-filter-mode-select',
cls: 'listing-filter-mode-select',
forceSelection: true,
editable: false,
allowBlank: false,
fieldLabel: '',
helpText: '',
listConfig: {
getInnerTpl: function () {
return '' +
'<div class="layout-select-item listing-filter-mode-select-item">' +
'<img src="{image}" width="70" height="50" class="layout-picto" />' +
'<div class="layout-info">' +
'<h1>{label}</h1>' +
'<div>{description}</div>' +
'</div>' +
'<div class="x-clear" />' +
'</div>' +
'';
}
},
createStore: function() {
this.store = Ext.create('Shopware.apps.Base.store.ListingFilterMode', this.storeConfig);
}
});
Ext.define('Shopware.apps.Base.view.element.MediaTextSelection', {
extend: 'Shopware.MediaManager.MediaTextSelection',
alias: [
'widget.base-element-mediatextselection'
]
});
Ext.define('Shopware.ModuleManager', {
singleton: true,
modules: Ext.create('Ext.util.MixedCollection'),
uuidGenerator: Ext.create('Ext.data.UuidGenerator'),
prefix: 'swag.',
constructor: function() {
var me = this;
window.addEventListener('message', Ext.bind(me.onPostMessage, me), false);
},
createSimplifiedModule: function(name, args) {
var me = this,
instance = me.uuidGenerator.generate(),
content = me.createContentFrame(name, instance),
config = me.createWindowConfiguration(args),
subApp = me.createSubApplication(instance),
windows = Ext.create('Ext.util.MixedCollection'),
contentWindow;
config.subApp = subApp;
subApp.app = Shopware.app.Application;
config._isMainWindow = true;
config.content = content;
config.component = 'main';
contentWindow = Ext.create('Shopware.window.SimpleModule', config);
contentWindow.show();
contentWindow.setLoading(true);
me.registerWindowEvents(contentWindow);
subApp.setAppWindow(contentWindow);
content.dom._window = contentWindow;
contentWindow.body.appendChild(content);
windows.add('main', contentWindow);
me.modules.add(instance, {
name: name,
instance: instance,
subApp: subApp,
windows: windows
});
},
createContentFrame: function(name, instance, fullPath) {
var me = this,
frame;
fullPath = fullPath || false;
frame = Ext.get(Ext.DomHelper.createDom({
'id': Ext.id(),
'tag': 'iframe',
'cls': 'module-frame',
'width': '100%',
'height': '100%',
'border': '0',
'frameBorder': 0,
'src': (fullPath ? name : '/stageware12/backend/' + name),
'data-instance': instance
}));
frame.on('load', me.onFrameLoaded, me, { instance: instance });
frame.on('mouseover', function() {
Shopware.app.Application.fireEvent('global-close-menu');
}, me);
return frame;
},
createWindowConfiguration: function(args) {
var config;
config = Ext.apply({ }, args);
config.tools = [{
type: 'refresh',
handler: function(event, tool, comp) {
var ownerCt = comp.ownerCt;
ownerCt.setLoading(true);
ownerCt.content.dom.contentWindow.location.reload();
}
}];
return config;
},
createSubApplication: function(instance) {
var subApp = Ext.create('Enlight.app.SubApplication', { name: instance });
subApp.onBeforeLaunch();
return subApp;
},
registerWindowEvents: function(win) {
var me = this,
resizer;
resizer = win.resizer;
resizer.on('beforeresize', function(resizer, width, height, event, eOpts) {
eOpts.win.content.hide();
}, me, { win: win });
resizer.on('resize', function(resizer, width, height, event, eOpts) {
eOpts.win.content.show();
}, me, { win: win });
return win;
},
onFrameLoaded: function(event, comp, eOpts) {
var instance = eOpts.instance,
mainWindow = comp._window;
mainWindow.setLoading(false);
comp.contentWindow.postMessage(this.prefix + JSON.stringify({
instance: instance,
component: mainWindow.component
}), window.location.origin);
},
createSubWindow: function(payload) {
var me = this,
instance = payload.instance,
content = me.createContentFrame(payload.url, instance, true),
config = me.createWindowConfiguration(payload),
module = me.modules.get(instance),
contentWindow;
if (!instance.length) {
return false;
}
config.subApp = module.subApp;
config._isMainWindow = false;
config.content = content;
delete config.id;
contentWindow = Ext.create('Shopware.window.SimpleModule', config);
contentWindow.show();
contentWindow.setLoading(true);
me.registerWindowEvents(contentWindow);
content.dom._window = contentWindow;
contentWindow.body.appendChild(content);
module.windows.add(payload.component, contentWindow);
return true;
},
sendMessageToSubWindow: function(payload) {
var me = this,
instance = payload.instance,
module, contentWindow;
if (!instance.length) {
return false;
}
module = me.modules.get(instance);
if(!module) {
return false;
}
contentWindow = module.windows.get(payload.component);
if(contentWindow === null) {
return false;
}
contentWindow.content.dom.contentWindow.postMessage(this.prefix + JSON.stringify({
jsonrpc: '2.0',
component: payload.component,
result: payload.params,
id: payload.id,
instance: payload.instance
}), window.location.origin);
},
onPostMessage: function(event) {
var me = this,
error = null,
result = null,
data,
subModule,
component;
if (!Ext.isDefined(event.data)) {
return;
}
if (event.data.indexOf(me.prefix) !== 0) {
return;
}
data = JSON.parse(event.data.substring(me.prefix.length));
if (event.origin !== window.location.origin) {
return;
}
subModule = me.modules.get(data.instance);
if (!data.instance || !subModule ||(subModule.instance !== data.instance)) {
return;
}
component = subModule.windows.get(data.component);
if (!data.params) {
data.params = {
instance: data.instance,
id: data.id
};
} else {
data.params.instance = data.instance;
data.params.id = data.id;
}
if(data.async === true) {
data.params._component = data.component;
}
try {
result = eval(
Ext.String.format('[0].[1]([2]);',
data.target,
data.method,
(data.params !== null ? JSON.stringify(data.params) : '')
)
);
} catch(err) {
error = { code: -32000, message: err.message };
}
if (result && result instanceof Enlight.app.Window) {
result = true;
}
if (result === undefined) {
result = true;
}
if (data.async === true) {
return false;
}
me.sendMessageToFrame(result, error, data.id, data.instance,data.component);
},
createGrowlMessage: function(params) {
var sticky = params.sticky,
opts;
if (!sticky) {
Shopware.Notification.createGrowlMessage(params.title, params.text, params.caller, 'growl', params.log);
} else {
opts = Ext.apply(params.opts, {
title: params.title,
text: params.text,
log: params.log
});
Shopware.Notification.createStickyGrowlMessage(opts, params.caller, 'growl');
}
return true;
},
createConfirmMessage: function(data) {
var me = this;
Ext.Msg.confirm(data.title, data.msg, function(btn) {
me.sendMessageToFrame(btn, null, data.id, data.instance, data._component);
});
},
createPromptMessage: function(data) {
var me = this;
Ext.Msg.prompt(data.title, data.msg, function(btn, text) {
me.sendMessageToFrame({ btn: btn, text: text }, null, data.id, data.instance, data._component);
});
},
createAlertMessage: function(data) {
Ext.Msg.alert(data.title, data.msg);
return true;
},
sendMessageToFrame: function(result, error, id, instance, comp) {
var subModule, component;
subModule = this.modules.get(instance);
if (!instance || !subModule ||(subModule.instance !== instance)) {
return;
}
component = subModule.windows.get(comp);
if(!component.content.dom || !component.content.dom.contentWindow) {
return;
}
component.content.dom.contentWindow.postMessage(this.prefix + JSON.stringify({
jsonrpc: '2.0',
result: result,
error: error,
id: id,
instance: instance,
component: comp
}), window.location.origin);
}
});
window.createSimpleModule = Shopware.ModuleManager.createSimplifiedModule.bind(Shopware.ModuleManager);
Ext.define('Shopware.attribute.SelectionFactory', {
getRelevantFields: function() {
return ['label', 'name', 'title', 'number', 'description','value'];
},
getLabelField: function(record) {
var fields = this.getRelevantFields();
var found = null;
var recordFields = Ext.Object.getKeys(record.data);
Ext.each(fields, function(field) {
if (recordFields.indexOf(field) >= 0) {
found = field;
return false;
}
});
return found;
},
getLabelOfObject: function(values) {
var fields = this.getRelevantFields();
var found = null;
var recordFields = Object.keys(values);
Ext.each(fields, function(field) {
if (recordFields.indexOf(field) >= 0) {
found = field;
return false;
}
});
if (found) {
return values[found];
} else {
return null;
}
},
createSelection: function(config, attribute, className, store, searchStore) {
config.store = store;
config.flex = 1;
config.searchStore = searchStore;
return Ext.create(className, config);
},
createDynamicSearchStore: function(attribute) {
return this.createEntitySearchStore(attribute.get('entity'), null);
},
createModelSearchStore: function(attribute, model) {
return this.createEntitySearchStore(attribute.get('entity'), model);
},
createEntitySearchStore: function(entity, extJsModel) {
if (!extJsModel) {
return Ext.create('Ext.data.Store', {
model: 'Shopware.model.Dynamic',
proxy: {
type: 'ajax',
url: '/stageware12/backend/EntitySearch/search?model=' + entity,
reader: Ext.create('Shopware.model.DynamicReader')
}
});
}
return Ext.create('Ext.data.Store', {
model: extJsModel,
proxy: {
type: 'ajax',
url: '/stageware12/backend/EntitySearch/search?model=' + entity,
reader: { type: 'json', root: 'data' }
}
});
}
});
Ext.define('Shopware.model.Dynamic', {
extend: 'Ext.data.Model'
});
Ext.define('Shopware.model.DynamicReader', {
extend: 'Ext.data.reader.Json',
root: 'data',
type: 'json',
readRecords: function(data) {
if (!data) {
return this.callParent(arguments);
}
if (!data.data) {
return this.callParent(arguments);
}
if (!data.data[0]) {
return this.callParent(arguments);
}
this.model.setFields(Object.keys(data.data[0]));
return this.callParent(arguments);
}
});
Ext.define('Shopware.attribute.FieldHandlerInterface', {
supports: function(attribute) {
throw 'Unimplemented method.';
},
create: function(field, attribute) {
throw 'Unimplemented method.';
}
});
Ext.define('Shopware.attribute.BooleanFieldHandler', {
extend: 'Shopware.attribute.FieldHandlerInterface',
supports: function(attribute) {
return (attribute.get('columnType') === 'boolean');
},
create: function(field, attribute) {
field.xtype = 'checkbox';
field.uncheckedValue = 0;
field.inputValue = 1;
if (attribute.get('defaultValue') !== null) {
field.checked = parseInt(attribute.get('defaultValue')) === 1;
field.defaultValue = field.checked;
}
return field;
}
});
Ext.define('Shopware.attribute.DateFieldHandler', {
extend: 'Shopware.attribute.FieldHandlerInterface',
supports: function(attribute) {
return (attribute.get('columnType') == 'date');
},
create: function(field, attribute) {
field.xtype = 'base-element-date';
field.submitFormat = 'Y-m-d';
field.dateCfg = { submitFormat: 'Y-m-d' };
return field;
}
});
Ext.define('Shopware.attribute.DateTimeFieldHandler', {
extend: 'Shopware.attribute.FieldHandlerInterface',
supports: function(attribute) {
return (attribute.get('columnType') == 'datetime');
},
create: function(field, attribute) {
field.xtype = 'base-element-datetime';
field.dateCfg = { submitFormat: 'Y-m-d' };
return field;
}
});
Ext.define('Shopware.attribute.FloatFieldHandler', {
extend: 'Shopware.attribute.FieldHandlerInterface',
supports: function(attribute) {
return (attribute.get('columnType') === 'float');
},
create: function(field, attribute) {
field.xtype = 'numberfield';
field.align = 'right';
if (attribute.get('defaultValue') !== null) {
field.value = parseFloat(attribute.get('defaultValue'));
field.defaultValue = field.value;
}
return field;
}
});
Ext.define('Shopware.attribute.HtmlFieldHandler', {
extend: 'Shopware.attribute.FieldHandlerInterface',
supports: function(attribute) {
return (attribute.get('columnType') === 'html');
},
create: function(field, attribute) {
field.xtype = 'tinymce';
field.height = 300;
return field;
}
});
Ext.define('Shopware.attribute.IntegerFieldHandler', {
extend: 'Shopware.attribute.FieldHandlerInterface',
supports: function(attribute) {
return (attribute.get('columnType') === 'integer');
},
create: function(field, attribute) {
field.xtype = 'numberfield';
field.align = 'right';
if (attribute.get('defaultValue') !== null) {
field.value = parseInt(attribute.get('defaultValue'));
field.defaultValue = field.value;
}
return field;
}
});
Ext.define('Shopware.attribute.SingleSelectionFieldHandler', {
extend: 'Shopware.attribute.FieldHandlerInterface',
mixins: {
factory: 'Shopware.attribute.SelectionFactory'
},
supports: function(attribute) {
return (attribute.get('columnType') === 'single_selection');
},
create: function(field, attribute) {
return this.createSelection(
field,
attribute,
'Shopware.form.field.SingleSelection',
this.createDynamicSearchStore(attribute)
);
}
});
Ext.define('Shopware.attribute.MultiSelectionFieldHandler', {
extend: 'Shopware.attribute.FieldHandlerInterface',
mixins: {
factory: 'Shopware.attribute.SelectionFactory'
},
supports: function(attribute) {
return (attribute.get('columnType') === 'multi_selection');
},
create: function(field, attribute) {
return this.createSelection(
field,
attribute,
'Shopware.form.field.Grid',
this.createDynamicSearchStore(attribute),
this.createDynamicSearchStore(attribute)
);
}
});
Ext.define('Shopware.attribute.StringFieldHandler', {
extend: 'Shopware.attribute.FieldHandlerInterface',
supports: function(attribute) {
return (attribute.get('columnType') === 'string');
},
create: function(field, attribute) {
field.xtype = 'textfield';
return field;
}
});
Ext.define('Shopware.attribute.TextAreaFieldHandler', {
extend: 'Shopware.attribute.FieldHandlerInterface',
supports: function(attribute) {
return (attribute.get('columnType') === 'text');
},
create: function(field, attribute) {
field.xtype = 'textarea';
field.height = 90;
return field;
}
});
Ext.define('Shopware.form.field.Grid', {
extend: 'Ext.form.FieldContainer',
alias: 'widget.shopware-form-field-grid',
cls: 'shopware-form-field-grid',
layout: {
type: 'vbox',
align: 'stretch'
},
mixins: {
formField: 'Ext.form.field.Base',
factory: 'Shopware.attribute.SelectionFactory'
},
height: 230,
maxHeight: 230,
hideHeaders: true,
baseBodyCls: Ext.baseCSSPrefix + 'form-item-body shopware-multi-selection-form-item-body',
separator: '|',
allowBlank: true,
fieldLabelConfig: 'default',
store: null,
searchStore: null,
allowSorting: true,
animateAddItem: true,
useSeparator: true,
ignoreDisabled: true,
allowDelete: true,
allowAdd: true,
initComponent: function() {
var me = this;
if ((!Ext.isDefined(this.store) || this.store === null) && Ext.isDefined(this.model)) {
var factory = Ext.create('Shopware.attribute.SelectionFactory');
this.store = factory.createEntitySearchStore(this.model);
this.searchStore = factory.createEntitySearchStore(this.model);
}
me.setReadOnlyProperties();
me.store = me.initializeStore();
me.items = me.createItems();
if (me.fieldLabelConfig !== 'default') {
me.fieldLabel = '';
}
me.callParent(arguments);
},
setReadOnlyProperties: function () {
this.allowSorting = !this.readOnly;
this.allowDelete = !this.readOnly;
this.allowAdd = !this.readOnly;
if (this.readOnly) {
this.cls = 'multi-selection-readonly'
}
},
setReadOnly: function(readOnly) {
this.readOnly = readOnly;
this.setReadOnlyProperties();
var columns = this.grid.columns;
columns[0].setHidden(readOnly);
columns[columns.length - 1].down('[cls=sprite-minus-circle-frame]').hidden = readOnly;
},
initializeStore: function() {
var me = this;
return Ext.create('Ext.data.Store', {
model: me.store.model,
proxy: me.store.getProxy(),
remoteSort: me.store.remoteSort,
remoteFilter: me.store.remoteFilter,
sorters: me.store.getSorters(),
filters: me.store.filters.items
});
},
createItems: function() {
var me = this, items = [];
me.grid = me.createGrid();
me.searchField = me.createSearchField();
items.push(me.searchField);
items.push(me.grid);
if (me.supportText) {
items.push(me.createSupportText(me.supportText));
}
return items;
},
createGrid: function() {
var me = this;
var viewConfig = { };
if (me.allowSorting) {
viewConfig = {
plugins: {
ptype: 'gridviewdragdrop',
ddGroup: 'shopware-form-field-grid' + this.id
},
listeners: {
drop: function () {
me.fireEvent('change', me, me.getValue());
}
}
};
}
return Ext.create('Ext.grid.Panel', {
columns: me.createColumns(),
store: me.store,
border: false,
flex: 1,
viewConfig: viewConfig,
hideHeaders: me.hideHeaders
});
},
createSearchField: function() {
return Ext.create('Shopware.form.field.SingleSelection', this.getComboConfig());
},
createColumns: function() {
var me = this, columns = [];
if (me.allowSorting) {
columns.push(me.createSortingColumn());
}
columns.push({
dataIndex: 'id',
hidden: true
});
columns.push({
dataIndex: 'label',
flex: 1,
renderer: me.labelRenderer,
scope: me
});
columns.push(me.createActionColumn());
return columns;
},
createSortingColumn: function() {
var me = this;
if (!me.allowSorting) {
return {
hidden: true
};
}
return {
hidden: me.readOnly,
width: 24,
hideable: false,
renderer: me.renderSorthandleColumn
};
},
createActionColumn: function() {
var items = this.createActionColumnItems();
return {
xtype: 'actioncolumn',
width: 30 * items.length,
items: items
};
},
createActionColumnItems: function() {
var items = [];
if (this.allowDelete && !this.readOnly) {
items.push(this.createDeleteColumn());
}
return items;
},
createDeleteColumn: function() {
var me = this;
return {
action: 'delete',
hidden: me.allowDelete,
iconCls: 'sprite-minus-circle-frame',
handler: function (view, rowIndex, colIndex, item, opts, record) {
me.removeItem(record);
}
};
},
insertGlobeIcon: function(icon) {
var me = this;
icon.set({
cls: Ext.baseCSSPrefix + 'translation-globe sprite-globe',
style: 'position: absolute;width: 16px; height: 16px;display:block;cursor:pointer;top:6px;right:6px;'
});
if (me.searchField.el) {
icon.insertAfter(me.searchField.el);
}
},
removeItem: function(record) {
var me = this;
me.store.remove(record);
this.fireEvent('change', this, this.getValue());
me.fixLayout();
},
addItem: function(record) {
var exist = false;
var me = this;
var newData = me.getItemData(record);
this.store.each(function(item) {
var data = me.getItemData(item);
if (data == newData) {
exist = true;
return false;
}
});
if (!exist) {
this.store.add(record);
}
me.fixLayout();
this.fireEvent('change', this, this.getValue());
return !exist;
},
getItemData: function(item) {
return item.get('id');
},
getComboConfig: function() {
var me = this;
var margin = 0;
if (me.translatable == true) {
margin = '0 25 0 0';
}
var emptyText = '';
if (me.fieldLabelConfig === 'as_empty_text') {
emptyText = me.fieldLabel;
}
return {
disabled: me.disabled,
readOnly: me.readOnly,
emptyText: emptyText,
helpText: me.helpText,
helpTitle: me.helpTitle,
store: me.searchStore,
multiSelect: true,
margin: margin,
hidden: !me.allowAdd,
isFormField: false,
pageSize: me.searchStore.pageSize,
listeners: {
beforeselect: function (combo, records) {
return me.onBeforeSelect(combo, records);
},
select: function(combo, records) {
return me.onSelect(combo, records);
}
}
};
},
onSelect: function(combo, records) {
},
onBeforeSelect: function(combo, records) {
var me = this, added = false;
Ext.each(records, function(record) {
added = me.addItem(record);
me.animateAdded(combo, added, record);
});
return false;
},
animateAdded: function(combo, added, record) {
if (!this.animateAddItem) {
return;
}
try {
var el = combo.picker.getNode(record);
if (added) {
el.style.background = 'rgba(0, 212, 0, 0.3)';
} else {
el.style.background = 'rgba(255, 0, 0, 0.3)'
}
Ext.Function.defer(function() {
el.style.background = 'none';
}, 500);
} catch (e) {
}
},
getValue: function() {
var me = this, recordData = [], store = me.store;
if (me.isDisabled() && !me.ignoreDisabled) {
return null;
}
store.each(function(item) {
recordData.push(me.getItemData(item));
});
if (recordData.length <= 0) {
return null;
}
if (!me.useSeparator) {
return recordData;
}
return me.separator + recordData.join(me.separator) + me.separator;
},
setValue: function(value) {
var me = this;
me.store.removeAll();
if (!value) {
me.isValid();
me.fixLayout();
return;
}
try {
var ids = value;
if (me.useSeparator) {
ids = value.split(me.separator);
}
ids = ids.filter(function(id) {
return id.length > 0 || id > 0;
});
} catch (e) {
return;
}
if (!ids || ids.length <= 0) {
me.isValid();
return;
}
me.store.load({
params: { ids: Ext.JSON.encode(ids) },
callback: function() {
me.isValid();
me.fixLayout();
}
});
},
fixLayout: function() {
if (!this.rendered) {
return;
}
if (this.getHeight() <= 0) {
return;
}
this.setHeight(this.getHeight());
},
getSubmitData: function() {
var value = { };
value[this.name] = this.getValue();
return value;
},
isValid: function() {
var me = this;
if (me.searchField && me.searchField.combo) {
me.searchField.combo.clearInvalid();
}
if (me.allowBlank) {
return true;
}
if (me.store.getCount() > 0) {
return true;
}
if (me.searchField && me.searchField.combo) {
me.searchField.combo.markInvalid([
'Es muss mindestens ein Wert ausgewählt sein'
]);
}
return false;
},
labelRenderer: function(value, meta, record) {
var field = this.getLabelField(record);
if (!field) {
return value;
}
return record.get(field);
},
renderSorthandleColumn: function (value, metadata) {
return '<div style="cursor: n-resize;">&#009868;</div>';
},
createSupportText: function(supportText) {
return Ext.create('Ext.Component', {
html: '<div>'+supportText+'</div>',
cls: Ext.baseCSSPrefix +'form-support-text'
});
},
enable: function() {
var me = this;
me.callParent(arguments);
if (me.grid) {
me.grid.enable();
}
if (me.searchField) {
me.searchField.enable();
}
},
disable: function() {
var me = this;
me.callParent(arguments);
if (me.grid) {
me.grid.disable();
}
if (me.searchField) {
me.searchField.disable();
}
}
});
Ext.define('Shopware.form.field.GridView', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-grid-view',
createItems: function() {
var me = this, items = [];
me.grid = me.createGrid();
me.toolbar = me.createToolbar();
items.push(me.toolbar);
items.push(me.grid);
if (me.supportText) {
items.push(me.createSupportText(me.supportText));
}
return items;
},
createSupportText: function(supportText) {
return Ext.create('Ext.Component', {
html: '<div>'+supportText+'</div>',
cls: Ext.baseCSSPrefix +'form-support-text'
});
},
createToolbar: function() {
var me = this;
return Ext.create('Ext.toolbar.Toolbar', {
items: me.createToolbarItems(),
ui: 'shopware-ui',
dock: 'top'
});
},
createToolbarItems: function() {
var me = this;
me.searchField = me.createSearchField();
me.deleteButton = me.createDeleteButton();
return [me.deleteButton, me.searchField]
},
createDeleteButton: function() {
var me = this;
return Ext.create('Ext.button.Button', {
text: 'Markierte Einträge löschen',
disabled: true,
iconCls: 'sprite-minus-circle-frame',
handler: function () {
me.onDeleteItems()
}
});
},
createGrid: function() {
var me = this;
return Ext.create('Ext.view.View', {
store: me.store,
itemSelector: '.item',
flex: 1,
multiSelect: true,
height: 196,
cls: 'form-field-grid-view',
padding: 10,
autoScroll: true,
tpl: me.createTemplate(),
listeners: {
selectionchange: me.onSelectItem,
scope: me
}
});
},
createTemplate: function() {
var me = this;
return new Ext.XTemplate(
'<tpl for=".">',
'<div class="item">' +
me.createItemTemplate() +
'</div>' +
'</tpl>'
);
},
createItemTemplate: function() {
return '<span>{label}</span>';
},
onDeleteItems: function() {
var me = this;
var selModel = me.grid.getSelectionModel();
Ext.each(selModel.getSelection(), function(record) {
me.removeItem(record);
});
},
onSelectItem: function(view, records) {
var me = this;
if (records.length > 0) {
me.deleteButton.enable();
} else {
me.deleteButton.disable()
}
}
});
Ext.define('Shopware.form.field.SingleSelection', {
extend: 'Ext.form.FieldContainer',
alias: 'widget.shopware-form-field-single-selection',
layout: 'anchor',
defaults: { anchor: '100%' },
baseBodyCls: Ext.baseCSSPrefix + 'form-item-body shopware-single-selection-form-item-body',
allowBlank: true,
mixins: {
formField: 'Ext.form.field.Base',
factory: 'Shopware.attribute.SelectionFactory'
},
initComponent: function() {
var me = this;
if (!Ext.isDefined(this.store) && Ext.isDefined(this.model)) {
var factory = Ext.create('Shopware.attribute.SelectionFactory');
this.store = factory.createEntitySearchStore(this.model);
}
var store = me.store;
me.store = Ext.create('Ext.data.Store', {
model: store.model,
proxy: store.getProxy(),
remoteSort: store.remoteSort,
remoteFilter: store.remoteFilter,
sorters: store.getSorters(),
filters: store.filters.items
});
me.items = me.createItems();
me.callParent(arguments);
if (me.value) {
me.setValue(me.value);
}
},
insertGlobeIcon: function(icon) {
var me = this;
icon.set({
cls: Ext.baseCSSPrefix + 'translation-globe sprite-globe',
style: 'position: absolute;width: 16px; height: 16px;display:block;cursor:pointer;top:6px;right:26px;'
});
if (me.combo && me.combo.inputEl) {
icon.insertAfter(me.combo.inputEl);
}
},
createItems: function() {
var items = [this.createSearchField()];
if (this.supportText) {
items.push(this.createSupportText(this.supportText));
}
return items;
},
createSupportText: function(supportText) {
return Ext.create('Ext.Component', {
html: '<div>'+supportText+'</div>',
cls: Ext.baseCSSPrefix +'form-support-text'
});
},
createSearchField: function() {
var me = this, events;
var config = me.getComboConfig();
var fireComboBoxEvents = function(event) {
me.combo.on(event, function () {
var args = [event];
for (var i = 0; i <= arguments.length; i++) {
args.push(arguments[i]);
}
return me.fireEvent.apply(me, args);
});
};
if (!config.displayField && !config.tpl) {
config = me.addDynamicDisplayField(config);
}
me.combo = Ext.create('Ext.form.field.ComboBox', config);
events = Object.keys(me.combo.events);
Ext.each(events, fireComboBoxEvents);
return me.combo;
},
addDynamicDisplayField: function(config) {
var me = this;
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<div class="x-boundlist-item">{[this.getRecordLabel(values)]}</div>',
'</tpl>',
{
getRecordLabel: function(values) {
return me.getLabelOfObject(values);
}
}
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'{[this.getRecordLabel(values)]}',
'</tpl>',
{
getRecordLabel: function(values) {
return me.getLabelOfObject(values);
}
}
);
return config;
},
getComboConfig: function() {
var me = this;
return {
disabled: me.disabled,
readOnly: me.readOnly,
emptyText: me.emptyText,
helpText: me.helpText,
helpTitle: me.helpTitle,
valueField: 'id',
queryMode: 'remote',
store: me.store,
allowBlank: me.allowBlank,
isFormField: false,
style: 'margin-right: 0 !important',
pageSize: me.store.pageSize,
labelWidth: 180,
minChars: 0
};
},
getValue: function() {
return this.combo.getValue();
},
setValue: function(value) {
var me = this;
if (value && !Ext.isObject(value)) {
me.resolveValue(value);
return;
}
if (!value) {
me.combo.clearValue();
} else {
me.combo.setValue(value);
}
},
getSubmitData: function() {
var value = { };
value[this.name] = this.getValue();
return value;
},
resolveValue: function(value) {
var me = this;
me.store.load({
params: { ids: Ext.JSON.encode([value]) },
callback: function(records) {
me.combo.setValue(records);
}
});
},
enable: function () {
this.callParent(arguments);
this.combo.enable();
},
disable: function () {
this.callParent(arguments);
this.combo.disable();
}
});
Ext.define('Shopware.form.field.MediaGrid', {
extend: 'Shopware.form.field.GridView',
cls: 'media-multi-selection',
alias: 'widget.shopware-form-field-media-grid',
baseBodyCls: Ext.baseCSSPrefix + 'form-item-body media-multi-selection-body',
createToolbarItems: function() {
var me = this;
var items = me.callParent(arguments);
if (me.helpText) {
items.push('->');
items.push(me.createHelp(me.helpText));
}
return items;
},
createItemTemplate: function() {
return '' +
'<img src="{thumbnail}" title="{name}" />' +
'';
},
createSearchField: function() {
var me = this;
me.selectButton = Ext.create('Ext.button.Button', {
text: 'Bild auswählen',
iconCls: 'sprite-inbox-select',
handler: function() {
me.openMediaManager()
}
});
return me.selectButton;
},
openMediaManager: function() {
var me = this;
Shopware.app.Application.addSubApplication({
name: 'Shopware.apps.MediaManager',
layout: 'small',
eventScope: me,
mediaSelectionCallback: me.onSelectMedia,
selectionMode: true
});
},
onSelectMedia: function(button, window, selection) {
var me = this;
Ext.each(selection, function(record) {
me.addItem(record);
});
window.close();
},
insertGlobeIcon: function(icon) {
var me = this;
icon.set({
cls: Ext.baseCSSPrefix + 'translation-globe sprite-globe',
style: 'position: absolute;width: 16px; height: 16px;display:block;cursor:pointer;top:6px;right:8px;'
});
if (me.searchField.el) {
icon.insertAfter(me.searchField.el);
}
},
createHelp: function (text) {
var icon = Ext.create('Ext.Component', {
html: '<span style="margin-top: 4px !important;" class="'+Ext.baseCSSPrefix + 'form-help-icon'+'"></span>',
width: 24,
height: 24,
margin: '0 30 0 0'
});
icon.on('afterrender', function() {
Ext.tip.QuickTipManager.register({
target: icon.el,
cls: Ext.baseCSSPrefix + 'form-tooltip',
title: '',
text: text,
width: 225,
anchorToTarget: true,
anchor: 'right',
anchorSize: {
width: 24,
height: 24
},
defaultAlign: 'tr',
showDelay: 250,
dismissDelay: 10000
});
});
return icon;
}
});
Ext.define('Shopware.form.field.ProductGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-product-grid',
createColumns: function() {
var me = this;
return [
me.createSortingColumn(),
{ dataIndex: 'articleActive', width: 30, renderer: me.booleanColumnRenderer },
{ dataIndex: 'number' },
{ dataIndex: 'name', flex: 1 },
{ dataIndex: 'additionalText', flex: 1 },
me.createActionColumn()
];
},
booleanColumnRenderer: function(value, meta, record) {
var active = (record.get('articleActive') && record.get('variantActive'));
var checked = 'sprite-ui-check-box-uncheck';
if (active === true || active === 1) {
checked = 'sprite-ui-check-box';
}
return '<span style="display:block; margin: 0 auto; height:16px; width:16px;" class="' + checked + '"></span>';
},
getItemData: function(item) {
return item.get('number');
},
createSearchField: function() {
return Ext.create('Shopware.form.field.ProductSingleSelection', this.getComboConfig());
},
createActionColumnItems: function() {
var me = this,
items = me.callParent(arguments);
items.push(me.createModuleIcon());
return items;
},
createModuleIcon: function() {
return {
action: 'open-article',
iconCls: 'sprite-inbox',
handler: function (view, rowIndex, colIndex, item, opts, record) {
Shopware.app.Application.addSubApplication({
name: 'Shopware.apps.Article',
action: 'detail',
params: {
articleId: record.get('articleId')
}
});
}
};
}
});
Ext.define('Shopware.form.field.PropertyOptionGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-property-option-grid',
createColumns: function() {
var me = this;
return [
me.createSortingColumn(),
{ dataIndex: 'optionName' },
{ dataIndex: 'value', flex: 1 },
me.createActionColumn()
];
},
createSearchField: function() {
return Ext.create('Shopware.form.field.PropertyOptionSingleSelection', this.getComboConfig());
}
});
Ext.define('Shopware.form.field.BlogGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-blog-grid',
mixins: ['Shopware.model.Helper'],
createColumns: function() {
var me = this;
var displayColumn = { dataIndex: 'displayDate', flex: 1 };
me.applyDateColumnConfig(displayColumn);
return [
me.createSortingColumn(),
{ dataIndex: 'authorName' },
{ dataIndex: 'title', flex: 1 },
displayColumn,
me.createActionColumn()
];
},
createSearchField: function() {
return Ext.create('Shopware.form.field.BlogSingleSelection', this.getComboConfig());
}
});
Ext.define('Shopware.form.field.CountryGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-country-grid',
mixins: ['Shopware.model.Helper'],
createSearchField: function() {
return Ext.create('Shopware.form.field.CountrySingleSelection', this.getComboConfig());
}
});
Ext.define('Shopware.form.field.CategoryGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-category-grid',
mixins: ['Shopware.model.Helper'],
createColumns: function() {
var me = this;
var activeColumn = { dataIndex: 'active', width: 30 };
me.applyBooleanColumnConfig(activeColumn);
return [
me.createSortingColumn(),
activeColumn,
{ dataIndex: 'name', flex: 1, renderer: me.nameRenderer, scope: me },
me.createActionColumn()
];
},
createSearchField: function() {
return Ext.create('Shopware.form.field.CategorySingleSelection', this.getComboConfig());
},
nameRenderer: function(value, meta, record) {
var parents = Ext.clone(record.get('parents'));
if (!parents || parents.length <= 0) {
parents = [];
}
parents.push(value);
return parents.join('>');
}
});
Ext.define('Shopware.form.field.ProductSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-product-single-selection',
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.valueField = 'number';
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<div class="x-boundlist-item">' +
'<tpl if="articleActive && variantActive">' +
'[aktiv]' +
'<tpl else>' +
'[inaktiv]' +
'</tpl>' +
' <b>{number}</b> - {name}' +
'<tpl if="additionalText">' +
'<i> ({additionalText})</i>' +
'</tpl>',
'</div>',
'</tpl>'
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<tpl if="articleActive && variantActive">' +
'[aktiv]' +
'<tpl else>' +
'[inaktiv]' +
'</tpl>' +
' {number} - {name}' +
'<tpl if="additionalText">' +
' ({additionalText})' +
'</tpl>',
'</tpl>'
);
return config;
}
});
Ext.define('Shopware.form.field.BlogSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-blog-single-selection',
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<tpl if="authorName">',
'<div class="x-boundlist-item"><i>{authorName}</i> - {title}</div>',
'<tpl else>',
'<div class="x-boundlist-item">{title}</div>',
'</tpl>',
'</tpl>'
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<tpl if="authorName">',
'{authorName} - {title}',
'<tpl else>',
'{title}',
'</tpl>',
'</tpl>'
);
return config;
}
});
Ext.define('Shopware.form.field.CountrySingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-country-single-selection',
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.store.remoteSort = true;
config.store.sort([
{
property: 'active',
direction: 'DESC'
},
{
property: 'name',
direction: 'ASC'
}
]);
return config;
}
});
Ext.define('Shopware.form.field.PropertyOptionSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-property-option-single-selection',
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<div class="x-boundlist-item">{optionName} > {value}</div>',
'</tpl>'
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'{optionName} > {value}',
'</tpl>'
);
return config;
}
});
Ext.define('Shopware.form.field.CategorySingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-category-single-selection',
getLabelOfObject: function(values) {
var parents = Ext.clone(values.parents);
if (!parents || parents.length <= 0) {
parents = [];
}
parents.push(values.name);
return parents.join('>');
}
});
Ext.define('Shopware.form.field.VoucherSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-voucher-single-selection',
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<tpl if="voucherCode">',
'<div class="x-boundlist-item">{description} <i>({voucherCode})</i></div>',
'<tpl else>',
'<div class="x-boundlist-item">{description}</div>',
'</tpl>',
'</tpl>'
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<tpl if="voucherCode">',
'{description} ({voucherCode})',
'<tpl else>',
'{description}',
'</tpl>',
'</tpl>'
);
return config;
}
});
Ext.define('Shopware.form.field.VoucherGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-voucher-grid',
createColumns: function() {
var me = this;
return [
me.createSortingColumn(),
{ dataIndex: 'description', flex: 2 },
{ dataIndex: 'voucherCode', flex: 1 },
{ dataIndex: 'mode', flex: 1, renderer: me.modeRenderer },
{ dataIndex: 'numOrder', flex: 1, renderer: me.orderedRenderer },
{ dataIndex: 'value', flex: 1, renderer: me.valueRenderer },
me.createActionColumn()
];
},
modeRenderer: function(value) {
if (value != 1) {
return 'Allgemein-Gültig';
}
return 'Individuell';
},
valueRenderer: function(value, meta, record) {
value = 'Wert: ' + value + '';
if(record.get('percental')){
return value.replace(/[.,]/, Ext.util.Format.decimalSeparator) + " %";
}
return value.replace(/[.,]/, Ext.util.Format.decimalSeparator);
},
orderedRenderer: function(value, meta, record) {
var numberOfUnits = record.get('numberOfUnits');
if (value < numberOfUnits) {
return '<span style="color:green;">' + value + ' / '  + numberOfUnits +'</span>';
}
else {
return '<span style="color:red;">' + value + ' / '  + numberOfUnits + '</span>';
}
},
createSearchField: function() {
return Ext.create('Shopware.form.field.VoucherSingleSelection', this.getComboConfig());
}
});
Ext.define('Shopware.form.field.ProductFeedGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-product-feed-grid',
mixins: ['Shopware.model.Helper'],
createColumns: function() {
var me = this;
var activeColumn = { dataIndex: 'active', width: 30 };
me.applyBooleanColumnConfig(activeColumn);
var lastExport = { dataIndex: 'lastExport' };
me.applyDateColumnConfig(lastExport);
return [
me.createSortingColumn(),
activeColumn,
{ dataIndex: 'fileName' },
{ dataIndex: 'name', flex: 1 },
{ dataIndex: 'countArticles', renderer: me.articleCountRenderer },
lastExport,
me.createActionColumn()
];
},
articleCountRenderer: function(value) {
return value + ' Artikel'
},
createSearchField: function() {
return Ext.create('Shopware.form.field.ProductFeedSingleSelection', this.getComboConfig());
}
});
Ext.define('Shopware.form.field.ProductFeedSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-product-feed-single-selection',
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<div class="x-boundlist-item">',
'<tpl if="active">',
'[aktiv]',
'<tpl else>',
'[inaktiv]',
'</tpl>',
'<tpl if="fileName">',
' {name} <i>({fileName})</i>',
'<tpl else>',
' {name}',
'</tpl>',
'</div>',
'</tpl>'
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<tpl if="active">',
'[aktiv]',
'<tpl else>',
'[inaktiv]',
'</tpl>',
'<tpl if="fileName">',
' {name} ({fileName})',
'<tpl else>',
' {name}',
'</tpl>',
'</tpl>'
);
return config;
}
});
Ext.define('Shopware.form.field.NewsletterGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-newsletter-grid',
mixins: ['Shopware.model.Helper'],
createColumns: function() {
var me = this;
var activeColumn = { dataIndex: 'status', width: 30 };
me.applyBooleanColumnConfig(activeColumn);
return [
me.createSortingColumn(),
activeColumn,
{ dataIndex: 'senderName', minWidth: 150 },
{ dataIndex: 'subject', flex: 1 },
{ dataIndex: 'senderMail', flex: 1 },
me.createActionColumn()
];
},
createSearchField: function() {
return Ext.create('Shopware.form.field.NewsletterSingleSelection', this.getComboConfig());
}
});
Ext.define('Shopware.form.field.NewsletterSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-newsletter-single-selection',
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<tpl if="senderName">',
'<div class="x-boundlist-item">{subject} <i>({senderName})</i></div>',
'<tpl else>',
'<div class="x-boundlist-item">{subject}</div>',
'</tpl>',
'</tpl>'
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<tpl if="senderName">',
'{subject} ({senderName})',
'<tpl else>',
'{subject}',
'</tpl>',
'</tpl>'
);
return config;
}
});
Ext.define('Shopware.form.field.PartnerGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-partner-grid',
mixins: ['Shopware.model.Helper'],
createColumns: function() {
var me = this;
var activeColumn = { dataIndex: 'active', width: 30 };
me.applyBooleanColumnConfig(activeColumn);
return [
me.createSortingColumn(),
activeColumn,
{ dataIndex: 'idCode' },
{ dataIndex: 'company', flex: 1 },
{ dataIndex: 'email', flex: 1 },
me.createActionColumn()
];
},
createSearchField: function() {
return Ext.create('Shopware.form.field.PartnerSingleSelection', this.getComboConfig());
}
});
Ext.define('Shopware.form.field.PartnerSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-partner-single-selection',
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<div class="x-boundlist-item">{idCode} - <i>{company} / {email}</i></div>',
'</tpl>'
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'{idCode} - {company} / {email}',
'</tpl>'
);
return config;
}
});
Ext.define('Shopware.form.field.FormGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-form-grid',
createColumns: function() {
var me = this;
return [
me.createSortingColumn(),
{ dataIndex: 'emailSubject', flex: 1 },
{ dataIndex: 'name', flex: 1 },
{ dataIndex: 'email', flex: 1 },
me.createActionColumn()
];
},
createSearchField: function() {
return Ext.create('Shopware.form.field.FormSingleSelection', this.getComboConfig());
}
});
Ext.define('Shopware.form.field.FormSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-form-single-selection',
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<div class="x-boundlist-item">{name} - <i>{emailSubject} ({email})</i></div>',
'</tpl>'
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'{name} - {emailSubject} ({email})',
'</tpl>'
);
return config;
}
});
Ext.define('Shopware.form.field.CustomerGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-customer-grid',
mixins: ['Shopware.model.Helper'],
createColumns: function() {
var me = this;
var activeColumn = { dataIndex: 'active', width: 30 };
me.applyBooleanColumnConfig(activeColumn);
return [
me.createSortingColumn(),
activeColumn,
{ dataIndex: 'number' },
{ dataIndex: 'email', flex: 1, renderer: me.mailRenderer },
{ dataIndex: 'firstname', flex: 1 },
{ dataIndex: 'lastname', flex: 1 },
{ dataIndex: 'customerGroup', flex: 1 },
{ dataIndex: 'company', flex: 1 },
me.createActionColumn()
];
},
mailRenderer: function(value) {
return Ext.String.format('<a href="mailto:[0]" data-qtip="[0]">[0]</a>', value)
},
createSearchField: function() {
return Ext.create('Shopware.form.field.CustomerSingleSelection', this.getComboConfig());
}
});
Ext.define('Shopware.form.field.CustomerSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-customer-single-selection',
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<tpl if="company">',
'<div class="x-boundlist-item"><b>{number}</b> - {firstname} {lastname} ({company}) - <i>{customerGroup}</i></div>',
'<tpl else>',
'<div class="x-boundlist-item"><b>{number}</b> - {firstname} {lastname} - <i>{customerGroup}</i></div>',
'</tpl>',
'</tpl>'
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<tpl if="company">',
'{number} - {firstname} {lastname} ({company}) - {customerGroup}',
'<tpl else>',
'{number} - {firstname} {lastname} - {customerGroup}',
'</tpl>',
'</tpl>'
);
return config;
}
});
Ext.define('Shopware.form.field.CustomerStreamGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-customer-stream-grid',
mixins: ['Shopware.model.Helper'],
displayNewsletterCount: false,
createColumns: function() {
var me = this;
return [
me.createSortingColumn(),
{ dataIndex: 'name', flex: 1, renderer: Ext.bind(me.nameRenderer, me) },
me.createActionColumn()
];
},
nameRenderer: function (value, meta, record) {
var qtip = '<b>' + record.get('name') + '</b>';
qtip += ' - ' + record.get('customer_count') + ' Kunde(n)';
if (record.get('freezeUp')) {
qtip += '<p>: ' + Ext.util.Format.date(record.get('freezeUp')) + '</p>';
}
qtip += '<br><p>' + record.get('description') +'</p>';
meta.tdAttr = 'data-qtip="' + qtip + '"';
if (this.displayNewsletterCount) {
return '<span class="stream-name-column"><b>' + value + '</b> - ' + record.get('newsletter_count') + ' Empfänger</span>';
} else {
return '<span class="stream-name-column"><b>' + value + '</b> - ' + record.get('customer_count') + ' Kunde(n)</span>';
}
},
createSearchField: function() {
var config = this.getComboConfig();
config.displayNewsletterCount = this.displayNewsletterCount;
return Ext.create('Shopware.form.field.CustomerStreamSingleSelection', config);
},
createActionColumnItems: function() {
var me = this,
items = me.callParent(arguments);
items.push(me.createModuleIcon());
return items;
},
createModuleIcon: function() {
return {
action: 'open-customer',
iconCls: 'sprite-customer-streams',
handler: function (view, rowIndex, colIndex, item, opts, record) {
Shopware.app.Application.addSubApplication({
name: 'Shopware.apps.Customer',
action: 'customer_stream',
params: {
streamId: record.get('id')
}
});
}
};
}
});
Ext.define('Shopware.form.field.CustomerStreamSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-customer-stream-single-selection',
displayNewsletterCount: false,
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<div class="x-boundlist-item">{name} - {customer_count} Kunde(n)</div>',
'</tpl>'
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'{name} - {customer_count} Kunde(n)',
'</tpl>'
);
if (me.displayNewsletterCount) {
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<div class="x-boundlist-item">{name} - {newsletter_count} Empfänger</div>',
'</tpl>'
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'{name} - {newsletter_count} Empfänger',
'</tpl>'
);
}
return config;
},
afterRender: function() {
var me = this,
el = me.getEl(),
inputCell = el.select('.x-form-trigger-input-cell', true).first(),
iconCell = new Ext.Element(document.createElement('td')),
icon = new Ext.Element(document.createElement('span'));
icon.set({
'cls': 'sprite-customer-streams',
'style': {
display: 'inline-block',
width: '16px',
height: '16px',
margin: '0 4px',
position: 'relative',
top: '2px'
}
});
iconCell.set({
'style': { width: '24px' }
});
icon.appendTo(iconCell);
iconCell.insertBefore(inputCell);
me.callParent(arguments);
}
});
Ext.define('Shopware.form.field.DispatchGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-dispatch-grid',
mixins: ['Shopware.model.Helper'],
createColumns: function() {
var me = this;
var activeColumn = { dataIndex: 'active', width: 30 };
me.applyBooleanColumnConfig(activeColumn);
return [
me.createSortingColumn(),
activeColumn,
{ dataIndex: 'name', flex: 1 },
me.createActionColumn()
];
}
});
Ext.define('Shopware.form.field.PaymentGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-payment-grid',
mixins: ['Shopware.model.Helper'],
createColumns: function() {
var me = this;
var activeColumn = { dataIndex: 'active', width: 30 };
me.applyBooleanColumnConfig(activeColumn);
return [
me.createSortingColumn(),
activeColumn,
{ dataIndex: 'name' },
{ dataIndex: 'description', flex: 1 },
me.createActionColumn()
];
},
createSearchField: function() {
return Ext.create('Shopware.form.field.PaymentSingleSelection', this.getComboConfig());
}
});
Ext.define('Shopware.form.field.PaymentSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-payment-single-selection',
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<div class="x-boundlist-item"><i>{name}</i> - {description}</div>',
'</tpl>'
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'{name} - {description}',
'</tpl>'
);
return config;
}
});
Ext.define('Shopware.form.field.MailGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-mail-grid',
createColumns: function() {
var me = this;
return [
me.createSortingColumn(),
{ dataIndex: 'name', flex: 1 },
{ dataIndex: 'subject', flex: 1 },
me.createActionColumn()
];
},
createSearchField: function() {
return Ext.create('Shopware.form.field.MailSingleSelection', this.getComboConfig());
}
});
Ext.define('Shopware.form.field.MailSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-mail-single-selection',
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<div class="x-boundlist-item">{subject} <i>({name})</i></div>',
'</tpl>'
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'{subject} ({name})',
'</tpl>'
);
return config;
}
});
Ext.define('Shopware.form.field.EmotionGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-emotion-grid',
mixins: ['Shopware.model.Helper'],
createColumns: function() {
var me = this;
var activeColumn = { dataIndex: 'active', width: 30 };
me.applyBooleanColumnConfig(activeColumn);
return [
me.createSortingColumn(),
activeColumn,
{ dataIndex: 'name', flex: 2 },
{ dataIndex: 'type', flex: 1 },
{ dataIndex: 'device', flex: 2, renderer: me.deviceRenderer },
me.createActionColumn()
];
},
createSearchField: function() {
return Ext.create('Shopware.form.field.EmotionSingleSelection', this.getComboConfig());
},
deviceRenderer: function(value, meta, record) {
var devices = '',
iconStyling = 'width:16px; height:16px; display:inline-block; margin-right:5px';
var snippets = {
desktop: 'Für Desktop Computer sichtbar',
tabletLandscape: 'Für Tablet Landscape Geräte sichtbar',
tablet: 'Für Tablet Portrait Geräte sichtbar',
mobileLandscape: 'Für mobile Landscape Geräte sichtbar',
mobile: 'Für mobile Portrait Geräte sichtbar'
};
if(value.indexOf('0') >= 0) {
devices += '<div class="sprite-imac" style="' + iconStyling + '" title="' + snippets.desktop + '">&nbsp;</div>';
}
if(value.indexOf('1') >= 0) {
devices += '<div class="sprite-ipad--landscape" style="' + iconStyling + '" title="' + snippets.tabletLandscape + '">&nbsp;</div>';
}
if(value.indexOf('2') >= 0) {
devices += '<div class="sprite-ipad--portrait" style="' + iconStyling + '" title="' + snippets.tablet + '">&nbsp;</div>';
}
if(value.indexOf('3') >= 0) {
devices += '<div class="sprite-iphone--landscape" style="' + iconStyling + '" title="' + snippets.mobileLandscape + '">&nbsp;</div>';
}
if(value.indexOf('4') >= 0) {
devices += '<div class="sprite-iphone--portrait" style="' + iconStyling + '" title="' + snippets.mobile + '">&nbsp;</div>';
}
return devices;
}
});
Ext.define('Shopware.form.field.EmotionSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-emotion-single-selection',
iconStyling: 'width:16px; height:16px; display:inline-block; margin-right:5px',
snippets: {
desktop: 'Für Desktop Computer sichtbar',
tabletLandscape: 'Für Tablet Landscape Geräte sichtbar',
tablet: 'Für Tablet Portrait Geräte sichtbar',
mobileLandscape: 'Für mobile Landscape Geräte sichtbar',
mobile: 'Für mobile Portrait Geräte sichtbar'
},
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<div class="x-boundlist-item">' +
'' +
'{name}   {[this.getDevices(values)]}' +
'' +
'</div>',
'</tpl>',
{
getDevices: function(values) {
var devices = '';
if(values.device.indexOf('0') >= 0) {
devices += '<div class="sprite-imac" style="' + me.iconStyling + '" title="' + me.snippets.desktop + '">&nbsp;</div>';
}
if(values.device.indexOf('1') >= 0) {
devices += '<div class="sprite-ipad--landscape" style="' + me.iconStyling + '" title="' + me.snippets.tabletLandscape + '">&nbsp;</div>';
}
if(values.device.indexOf('2') >= 0) {
devices += '<div class="sprite-ipad--portrait" style="' + me.iconStyling + '" title="' + me.snippets.tablet + '">&nbsp;</div>';
}
if(values.device.indexOf('3') >= 0) {
devices += '<div class="sprite-iphone--landscape" style="' + me.iconStyling + '" title="' + me.snippets.mobileLandscape + '">&nbsp;</div>';
}
if(values.device.indexOf('4') >= 0) {
devices += '<div class="sprite-iphone--portrait" style="' + me.iconStyling + '" title="' + me.snippets.mobile + '">&nbsp;</div>';
}
return '<div style="float: right;">' + devices + '</div>';
}
}
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'{name}',
'</tpl>'
);
return config;
}
});
Ext.define('Shopware.form.field.PremiumGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-premium-grid',
createColumns: function() {
var me = this;
return [
me.createSortingColumn(),
{ dataIndex: 'orderNumberExport', flex: 1 },
{ dataIndex: 'name', flex: 2, renderer: me.productRenderer },
{ dataIndex: 'shop' },
me.createActionColumn()
];
},
createSearchField: function() {
return Ext.create('Shopware.form.field.PremiumSingleSelection', this.getComboConfig());
},
productRenderer: function(value, meta, record) {
return '<b>'+record.get('number')+'</b> - ' + value;
}
});
Ext.define('Shopware.form.field.PremiumSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-premium-single-selection',
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<div class="x-boundlist-item">{orderNumberExport} - (<b>{number}</b> - {name})</div>',
'</tpl>'
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'{orderNumberExport} - ({number} - {name})',
'</tpl>'
);
return config;
}
});
Ext.define('Shopware.form.field.ProductStreamGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-product-stream-grid',
createColumns: function() {
var me = this;
return [
me.createSortingColumn(),
{ dataIndex: 'name' },
{ dataIndex: 'description', flex: 1 },
me.createActionColumn()
];
},
createSearchField: function() {
return Ext.create('Shopware.form.field.ProductStreamSingleSelection', this.getComboConfig());
}
});
Ext.define('Shopware.form.field.ProductStreamSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-product-stream-single-selection',
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<div class="x-boundlist-item">{name} <i>({description})</i></div>',
'</tpl>'
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'{name} ({description})',
'</tpl>'
);
return config;
}
});
Ext.define('Shopware.form.field.ShopGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-shop-grid',
mixins: ['Shopware.model.Helper'],
createColumns: function() {
var me = this;
var activeColumn = { dataIndex: 'active', width: 30 };
me.applyBooleanColumnConfig(activeColumn);
return [
me.createSortingColumn(),
activeColumn,
{ dataIndex: 'name', flex: 1 },
{ dataIndex: 'category', flex: 1, renderer: me.categoryRenderer },
{ dataIndex: 'basePath', width: 90 },
me.createActionColumn()
];
},
categoryRenderer: function(value) {
return 'Kategorie: ' + value;
}
});
Ext.define('Shopware.form.field.CustomSortingGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-custom-sorting-grid',
mixins: ['Shopware.model.Helper'],
hideHeaders: false,
initComponent: function() {
var me = this;
me.callParent(arguments);
me.grid.view.on('drop', Ext.bind(me.onDrop, me));
},
createColumns: function() {
var me = this;
return [
me.createSortingColumn(),
me.applyBooleanColumnConfig({
dataIndex: 'active',
width: 90,
header: 'Aktiv'
}),
{
header: 'Name',
dataIndex: 'label',
flex: 1
},
{
header: 'Standard Sortierung',
renderer: Ext.bind(me.defaultColumnRenderer, me),
flex: 1
},
me.createActionColumn()
];
},
removeItem: function(record) {
var me = this;
me.callParent(arguments);
this.grid.reconfigure(this.grid.getStore());
},
defaultColumnRenderer: function(value, meta, record) {
return this.booleanColumnRenderer(
(this.store.indexOf(record) === 0),
meta,
record
);
},
onDrop: function() {
this.grid.reconfigure(this.grid.getStore());
}
});
Ext.define('Shopware.form.field.CustomFacetGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-custom-facet-grid',
mixins: ['Shopware.model.Helper'],
createColumns: function() {
var me = this;
return [
me.createSortingColumn(),
me.applyBooleanColumnConfig({
dataIndex: 'active',
width: 90
}),
{
dataIndex: 'name',
flex: 1
},
me.createActionColumn()
];
}
});
Ext.define('Shopware.form.field.AttributeSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-attribute-single-selection',
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.valueField = 'columnName';
return config;
},
getLabelOfObject: function(values) {
var label = values.label;
if (!label) {
label = values.columnName;
}
if (values.helpText) {
label += ' [' + values.helpText + ']';
}
return label;
},
resolveValue: function(value) {
var me = this;
me.store.load({
params: { columns: Ext.JSON.encode([value]) },
callback: function(records) {
me.combo.setValue(records);
}
});
}
});
Ext.define('Shopware.form.field.OrderDetailGrid', {
extend: 'Shopware.form.field.Grid',
alias: 'widget.shopware-form-field-order-detail-grid',
mixins: ['Shopware.model.Helper'],
createColumns: function() {
var me = this;
return [
me.createSortingColumn(),
{ dataIndex: 'quantity' },
{ dataIndex: 'articleNumber' },
{ dataIndex: 'price', renderer: me.priceRenderer },
{ dataIndex: 'articleName' },
me.createActionColumn()
];
},
priceRenderer: function(value) {
if ( value === Ext.undefined ) {
return value;
}
return Ext.util.Format.currency(value);
},
createSearchField: function() {
return Ext.create('Shopware.form.field.OrderDetailSingleSelection', this.getComboConfig());
}
});
Ext.define('Shopware.form.field.OrderDetailSingleSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-oder-detail-single-selection',
getComboConfig: function() {
var me = this;
var config = me.callParent(arguments);
config.tpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'<div class="x-boundlist-item"><b>{quantity}x {articleNumber}</b> ({[this.formatPrice(values.price)]}) - {articleName}</div>',
'</tpl>',
{
formatPrice: function(value) {
if ( value === Ext.undefined ) {
return value;
}
return Ext.util.Format.currency(value);
}
}
);
config.displayTpl = Ext.create('Ext.XTemplate',
'<tpl for=".">',
'{quantity}x {articleNumber}</b> ({[this.formatPrice(values.price)]}) - {articleName}',
'</tpl>',
{
formatPrice: function(value) {
if ( value === Ext.undefined ) {
return value;
}
return Ext.util.Format.currency(value);
}
}
);
return config;
},
});
Ext.define('Shopware.form.field.ProductStreamSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: ['widget.productstreamselection', 'widget.streamselect'],
name: 'stream_selection',
valueField: 'id',
displayField: 'name',
labelWidth: 155,
snippets: {
fields: {
streamFieldLabel: 'Product Stream',
streamFieldEmptyText: 'Bitte auswählen ...'
}
},
initComponent: function() {
var me = this;
me.fieldLabel = me.fieldLabel || me.snippets.fields.streamFieldLabel;
me.emptyText = me.emptyText || me.snippets.fields.streamFieldEmptyText;
me.initialConfig.fieldLabel = me.fieldLabel;
var factory = Ext.create('Shopware.attribute.SelectionFactory');
me.store = factory.createEntitySearchStore("Shopware\\Models\\ProductStream\\ProductStream");
me.searchStore = factory.createEntitySearchStore("Shopware\\Models\\ProductStream\\ProductStream");
me.callParent(arguments);
},
afterRender: function() {
var me = this,
el = me.getEl(),
inputCell = el.select('.x-form-trigger-input-cell', true).first(),
iconCell = new Ext.Element(document.createElement('td')),
icon = new Ext.Element(document.createElement('span'));
icon.set({
'cls': 'sprite-product-streams',
'style': {
display: 'inline-block',
width: '16px',
height: '16px',
margin: '0 4px',
position: 'relative',
top: '2px'
}
});
iconCell.set({
'style': {
width: '24px'
}
});
icon.appendTo(iconCell);
iconCell.insertBefore(inputCell);
me.callParent(arguments);
}
});
Ext.define('Shopware.form.field.ContentTypeSelection', {
extend: 'Shopware.form.field.SingleSelection',
alias: 'widget.shopware-form-field-content-type-selection',
model: 'content_types',
});
Ext.define('Shopware.attribute.AbstractEntityFieldHandler', {
extend: 'Shopware.attribute.FieldHandlerInterface',
mixins: {
factory: 'Shopware.attribute.SelectionFactory'
},
entity: null,
singleSelectionClass: null,
multiSelectionClass: null,
supports: function(attribute) {
if (this.entity == null) {
return false;
}
return (
(attribute.get('columnType') === 'multi_selection' || attribute.get('columnType') === 'single_selection')
&&
(attribute.get('entity') == this.entity)
);
},
create: function(field, attribute) {
var me = this;
if (attribute.get('columnType') === 'single_selection') {
return me.createSelection(
field,
attribute,
me.singleSelectionClass,
me.createDynamicSearchStore(attribute)
);
}
return me.createSelection(
field,
attribute,
me.multiSelectionClass,
me.createDynamicSearchStore(attribute),
me.createDynamicSearchStore(attribute)
);
}
});
Ext.define('Shopware.attribute.CategoryFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Category\\Category",
singleSelectionClass: 'Shopware.form.field.CategorySingleSelection',
multiSelectionClass: 'Shopware.form.field.CategoryGrid'
});
Ext.define('Shopware.attribute.BlogFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Blog\\Blog",
singleSelectionClass: 'Shopware.form.field.BlogSingleSelection',
multiSelectionClass: 'Shopware.form.field.BlogGrid'
});
Ext.define('Shopware.attribute.CountryFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Country\\Country",
singleSelectionClass: 'Shopware.form.field.CountrySingleSelection',
multiSelectionClass: 'Shopware.form.field.CountryGrid'
});
Ext.define('Shopware.attribute.ProductFieldHandler', {
extend: 'Shopware.attribute.MultiSelectionFieldHandler',
mixins: {
factory: 'Shopware.attribute.SelectionFactory'
},
supports: function(attribute) {
return (
(attribute.get('columnType') == 'multi_selection' || attribute.get('columnType') == 'single_selection')
&&
(attribute.get('entity') == "Shopware\\Models\\Article\\Article" || attribute.get('entity') == "Shopware\\Models\\Article\\Detail")
);
},
create: function(field, attribute) {
var me = this;
if (attribute.get('columnType') == 'single_selection') {
return me.createSelection(
field,
attribute,
'Shopware.form.field.ProductSingleSelection',
me.createDynamicSearchStore(attribute)
);
}
return me.createSelection(
field,
attribute,
'Shopware.form.field.ProductGrid',
me.createDynamicSearchStore(attribute),
me.createDynamicSearchStore(attribute)
);
}
});
Ext.define('Shopware.attribute.PropertyOptionFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Property\\Value",
singleSelectionClass: 'Shopware.form.field.PropertyOptionSingleSelection',
multiSelectionClass: 'Shopware.form.field.PropertyOptionGrid'
});
Ext.define('Shopware.attribute.MediaFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Media\\Media",
singleSelectionClass: 'Shopware.form.field.Media',
multiSelectionClass: 'Shopware.form.field.MediaGrid'
});
Ext.define('Shopware.attribute.VoucherFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Voucher\\Voucher",
singleSelectionClass: 'Shopware.form.field.VoucherSingleSelection',
multiSelectionClass: 'Shopware.form.field.VoucherGrid'
});
Ext.define('Shopware.attribute.ProductFeedFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\ProductFeed\\ProductFeed",
singleSelectionClass: 'Shopware.form.field.ProductFeedSingleSelection',
multiSelectionClass: 'Shopware.form.field.ProductFeedGrid'
});
Ext.define('Shopware.attribute.NewsletterFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Newsletter\\Newsletter",
singleSelectionClass: 'Shopware.form.field.NewsletterSingleSelection',
multiSelectionClass: 'Shopware.form.field.NewsletterGrid'
});
Ext.define('Shopware.attribute.PartnerFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Partner\\Partner",
singleSelectionClass: 'Shopware.form.field.PartnerSingleSelection',
multiSelectionClass: 'Shopware.form.field.PartnerGrid'
});
Ext.define('Shopware.attribute.FormFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Form\\Form",
singleSelectionClass: 'Shopware.form.field.FormSingleSelection',
multiSelectionClass: 'Shopware.form.field.FormGrid'
});
Ext.define('Shopware.attribute.CustomerFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Customer\\Customer",
singleSelectionClass: 'Shopware.form.field.CustomerSingleSelection',
multiSelectionClass: 'Shopware.form.field.CustomerGrid'
});
Ext.define('Shopware.attribute.CustomerStreamFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\CustomerStream\\CustomerStream",
singleSelectionClass: 'Shopware.form.field.CustomerStreamSingleSelection',
multiSelectionClass: 'Shopware.form.field.CustomerStreamGrid'
});
Ext.define('Shopware.attribute.DispatchFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Dispatch\\Dispatch",
singleSelectionClass: 'Shopware.form.field.SingleSelection',
multiSelectionClass: 'Shopware.form.field.DispatchGrid'
});
Ext.define('Shopware.attribute.PaymentFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Payment\\Payment",
singleSelectionClass: 'Shopware.form.field.PaymentSingleSelection',
multiSelectionClass: 'Shopware.form.field.PaymentGrid'
});
Ext.define('Shopware.attribute.MailFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Mail\\Mail",
singleSelectionClass: 'Shopware.form.field.MailSingleSelection',
multiSelectionClass: 'Shopware.form.field.MailGrid'
});
Ext.define('Shopware.attribute.EmotionFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Emotion\\Emotion",
singleSelectionClass: 'Shopware.form.field.EmotionSingleSelection',
multiSelectionClass: 'Shopware.form.field.EmotionGrid'
});
Ext.define('Shopware.attribute.PremiumFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Premium\\Premium",
singleSelectionClass: 'Shopware.form.field.PremiumSingleSelection',
multiSelectionClass: 'Shopware.form.field.PremiumGrid'
});
Ext.define('Shopware.attribute.ProductStreamFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\ProductStream\\ProductStream",
singleSelectionClass: 'Shopware.form.field.ProductStreamSingleSelection',
multiSelectionClass: 'Shopware.form.field.ProductStreamGrid'
});
Ext.define('Shopware.attribute.ShopFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Shop\\Shop",
singleSelectionClass: 'Shopware.form.field.SingleSelection',
multiSelectionClass: 'Shopware.form.field.ShopGrid'
});
Ext.define('Shopware.attribute.ComboBoxFieldHandler', {
extend: 'Shopware.attribute.FieldHandlerInterface',
supports: function(attribute) {
return (attribute.get('columnType') == 'combobox');
},
create: function(field, attribute) {
var data = [];
field.xtype = 'combobox';
field.displayField = 'value';
field.valueField = 'key';
if (attribute.get('arrayStore')) {
data = Ext.JSON.decode(attribute.get('arrayStore'))
}
field.store = Ext.create('Ext.data.Store', {
fields: ['key', 'value'],
data: data
});
return field;
}
});
Ext.define('Shopware.attribute.OrderDetailFieldHandler', {
extend: 'Shopware.attribute.AbstractEntityFieldHandler',
entity: "Shopware\\Models\\Order\\Detail",
singleSelectionClass: 'Shopware.form.field.OrderDetailSingleSelection',
multiSelectionClass: 'Shopware.form.field.OrderDetailGrid'
});
Ext.define('Shopware.attribute.Form', {
extend: 'Ext.form.Panel',
layout: 'anchor',
alias: 'widget.shopware-attribute-form',
cls: 'shopware-attribute-form',
bodyStyle: {
background: 'transparent'
},
autoScroll: false,
mixins: { helper: 'Shopware.model.Helper' },
defaults: { anchor: '100%' },
border: false,
fieldSetPadding: 10,
fields: [],
table: null,
allowTranslation: true,
tabPanel: null,
translationForm: null,
configLoaded: false,
translationPlugin: null,
initComponent: function() {
var me = this;
me.typeHandlers = me.registerTypeHandlers();
me.initTabChange();
me.initTranslation();
me.loadConfig();
me.on('expand', function() {
me.refreshTranslationPlugin();
});
me.on('show', function() {
me.refreshTranslationPlugin();
});
me.callParent(arguments);
},
initTabChange: function() {
var me = this;
if (!me.tabPanel) {
return;
}
me.on('config-loaded', function() {
me.tabPanel.setActiveTab(0);
}, me, { single: true });
},
initTranslation: function() {
var me = this;
if (!me.allowTranslation) {
return;
}
me.translationPlugin = Ext.create('Shopware.form.Translation', {
translationType: me.table
});
me.plugins = [me.translationPlugin];
},
loadAttribute: function(foreignKey, callback) {
var me = this;
callback = callback ? callback: Ext.emptyFn;
if (!foreignKey) {
me.disableForm(true);
callback();
return;
}
if (!me.configLoaded) {
me.on('config-loaded', function() {
me.loadAttribute(foreignKey, callback);
}, me, { single: true });
return;
}
if (me.fields.length <= 0) {
callback();
return;
}
try {
me.disableForm(false);
} catch (e) { }
me.resetFields();
me.setLoading(true);
me.load({
url: '/stageware12/backend/AttributeData/loadData',
params: {
_foreignKey: foreignKey,
_table: me.table
},
success: function() {
me.setLoading(false);
try {
me.refreshTranslationPlugin(foreignKey);
} catch (e) { }
callback();
},
failure: function() {
me.setLoading(false);
me.resetFields();
callback();
}
});
},
disableForm: function(disabled) {
var me = this;
if (me.fields.length <= 0) {
return;
}
me.setDisabled(disabled);
},
resetFields: function() {
var me = this;
var fields = me.getForm().getFields();
Ext.each(fields.items, function(field) {
try {
field.setValue(typeof field.defaultValue === 'undefined' ? null : field.defaultValue);
} catch (e) {
}
});
},
saveAttribute: function(foreignKey, callback) {
var me = this, callbackFn = Ext.emptyFn;
if (Ext.isFunction(callback)) {
callbackFn = callback;
}
if (!foreignKey) {
callbackFn(false);
return;
}
if (!me.getForm().isValid()) {
callbackFn(false);
return;
}
if (me.fields.length <= 0) {
callbackFn(false);
return;
}
me.submit({
url: '/stageware12/backend/AttributeData/saveData',
params: {
_table: me.table,
_foreignKey: foreignKey
},
success: function() {
callbackFn(true);
},
failure: function() {
callbackFn(false);
}
});
},
refreshTranslationPlugin: function(foreignKey) {
var me = this;
if (foreignKey) {
me._translationConfig.translationKey = foreignKey;
}
if (me.translationForm) {
me.translationForm.translationPlugin.initTranslationFields(me.translationForm);
return;
}
if (!me.translationPlugin || !me.allowTranslation) {
return;
}
me.translationPlugin.initTranslationFields(me);
},
loadConfig: function() {
var me = this;
me.configLoaded = false;
me.store = Ext.create('Shopware.store.AttributeConfig');
me.store.getProxy().extraParams = { table: me.table };
me.store.load(function(attributes) {
me.fields = me.createFields(attributes);
me.removeAll();
me.add(me.createFieldSet(me.fields));
me.configLoaded = true;
me.refreshTranslationPlugin();
me.fireEvent('config-loaded', me.fields);
});
},
createFieldSet: function(fields) {
var me = this, items, hidden = false;
items = fields;
if (fields.length <= 0) {
items = [me.createNotification()];
}
me.fieldSet = Ext.create('Ext.form.FieldSet', {
title: 'Freitextfelder',
defaults: { anchor: '100%' },
layout: 'anchor',
background: 'transparent',
hidden: hidden,
items: [{
xtype: 'container',
padding: me.fieldSetPadding,
defaults: me.defaults,
layout: 'anchor',
items: items
}]
});
return me.fieldSet;
},
createNotification: function() {
var me = this;
me.moduleButton = Ext.create('Ext.button.Button', {
text: 'Jetzt konfigurieren',
cls: 'primary attribute-notification-button configure-button',
margin: 4,
handler: function() {
Shopware.app.Application.addSubApplication({
name: 'Shopware.apps.Attributes',
params: {
table: me.table
}
});
}
});
me.reloadButton = Ext.create('Ext.button.Button', {
text: 'Aktualisieren',
cls: 'secondary attribute-notification-button',
handler: function() {
me.loadConfig();
}
});
var notification = Ext.create('Ext.Component', {
cls: 'attribute-notification',
padding: 10,
html: 'Für dieses Module wurden noch keine Freitextfelder konfiguriert'
});
return Ext.create('Ext.container.Container', {
items: [notification, me.moduleButton, me.reloadButton]
});
},
createFields: function(attributes) {
var me = this, fields = [];
Ext.each(attributes, function(attribute) {
var field = {
name: '__attribute_' + attribute.get('columnName'),
translatable: attribute.get('translatable'),
fieldLabel: attribute.get('label'),
supportText: attribute.get('supportText'),
helpText: attribute.get('helpText'),
labelWidth: 155,
value: attribute.get('defaultValue'),
readOnly: attribute.get('readonly')
};
var handler = me.getTypeHandler(attribute);
if (handler && attribute.get('displayInBackend')) {
fields.push(handler.create(field, attribute));
}
});
return fields;
},
getTypeHandler: function(attribute) {
var me = this;
var found = null;
Ext.each(me.typeHandlers, function(handler) {
if (handler.supports(attribute)) {
found = handler;
return false;
}
});
return found;
},
registerTypeHandlers: function() {
return [
Ext.create('Shopware.attribute.ShopFieldHandler'),
Ext.create('Shopware.attribute.ProductStreamFieldHandler'),
Ext.create('Shopware.attribute.PremiumFieldHandler'),
Ext.create('Shopware.attribute.EmotionFieldHandler'),
Ext.create('Shopware.attribute.MailFieldHandler'),
Ext.create('Shopware.attribute.PaymentFieldHandler'),
Ext.create('Shopware.attribute.DispatchFieldHandler'),
Ext.create('Shopware.attribute.CustomerFieldHandler'),
Ext.create('Shopware.attribute.CustomerStreamFieldHandler'),
Ext.create('Shopware.attribute.FormFieldHandler'),
Ext.create('Shopware.attribute.PartnerFieldHandler'),
Ext.create('Shopware.attribute.NewsletterFieldHandler'),
Ext.create('Shopware.attribute.OrderDetailFieldHandler'),
Ext.create('Shopware.attribute.ProductFeedFieldHandler'),
Ext.create('Shopware.attribute.VoucherFieldHandler'),
Ext.create('Shopware.attribute.PropertyOptionFieldHandler'),
Ext.create('Shopware.attribute.CategoryFieldHandler'),
Ext.create('Shopware.attribute.MediaFieldHandler'),
Ext.create('Shopware.attribute.ProductFieldHandler'),
Ext.create('Shopware.attribute.BlogFieldHandler'),
Ext.create('Shopware.attribute.CountryFieldHandler'),
Ext.create('Shopware.attribute.BooleanFieldHandler'),
Ext.create('Shopware.attribute.DateFieldHandler'),
Ext.create('Shopware.attribute.DateTimeFieldHandler'),
Ext.create('Shopware.attribute.FloatFieldHandler'),
Ext.create('Shopware.attribute.HtmlFieldHandler'),
Ext.create('Shopware.attribute.IntegerFieldHandler'),
Ext.create('Shopware.attribute.StringFieldHandler'),
Ext.create('Shopware.attribute.TextAreaFieldHandler'),
Ext.create('Shopware.attribute.ComboBoxFieldHandler'),
Ext.create('Shopware.attribute.SingleSelectionFieldHandler'),
Ext.create('Shopware.attribute.MultiSelectionFieldHandler')
];
}
});
Ext.define('Shopware.attribute.Window', {
extend: 'Enlight.app.Window',
table: null,
layout: 'border',
iconCls: 'sprite-attributes',
allowTranslation: true,
footerButton: false,
initComponent: function() {
var me = this;
me.items = me.createItems();
me.dockedItems = me.createDockedItems();
me.callParent(arguments);
if (me.record) {
me.loadAttribute(me.record);
}
},
loadAttribute: function(record) {
var me = this;
me.record = record;
me.attributeForm.loadAttribute(record.get('id'));
me.setTitle(this.getRecordTitle(record));
},
saveAttribute: function() {
var me = this;
me.attributeForm.saveAttribute(
me.record.get('id'),
function() {
me.destroy();
}
);
},
createItems: function() {
return [this.createForm()];
},
createDockedItems: function() {
return [this.createToolbar()];
},
createToolbar: function() {
return Ext.create('Ext.toolbar.Toolbar', {
dock: 'bottom',
items: this.createToolbarItems()
});
},
createToolbarItems: function() {
return [
'->',
this.createCancelButton(),
this.createSaveButton()
];
},
createSaveButton: function() {
var me = this;
me.saveButton = Ext.create('Ext.button.Button', {
text: 'Speichern',
cls: 'primary',
handler: function() {
me.saveAttribute();
}
});
return me.saveButton;
},
createCancelButton: function() {
var me = this;
me.cancelButton = Ext.create('Ext.button.Button', {
text: 'Abbrechen',
cls: 'secondary',
handler: function() {
me.destroy();
}
});
return me.cancelButton;
},
createForm: function() {
var me = this;
me.attributeForm = Ext.create('Shopware.attribute.Form', {
table: me.table,
bodyPadding: 20,
region: 'center',
autoScroll: true,
allowTranslation: me.allowTranslation
});
return me.attributeForm;
},
getRecordTitle: function(record) {
var me = this;
if (me.title) {
return me.title;
}
var plain = 'Freitextfelder';
if (!record) {
return plain;
}
var prefix = 'Freitextfelder' + ': ';
if (record.get('name')) {
return prefix + record.get('name');
}
if (record.get('label')) {
return prefix + record.get('label');
}
if (record.get('description')) {
return prefix + record.get('description');
}
if (record.get('number')) {
return prefix + record.get('number');
}
return plain;
}
});
Ext.define('Shopware.attribute.Button', {
extend: 'Ext.button.Button',
table: null,
allowTranslation: true,
backendAttributes: [],
hidden: true,
iconCls: 'sprite-attributes',
text: 'Freitextfelder',
cls: 'secondary small',
initComponent: function() {
var me = this;
me.attributeWindow = Ext.create('Shopware.attribute.Window', {
table: me.table,
allowTranslation: me.allowTranslation
});
me.attributeWindow.attributeForm.on('config-loaded', function(fields) {
me.backendAttributes = fields;
me.switchButton();
});
me.handler = function() {
me.openAttributes(me.record);
};
me.callParent(arguments);
},
openAttributes: function(record) {
var me = this;
me.attributeWindow = Ext.create('Shopware.attribute.Window', {
table: me.table,
allowTranslation: me.allowTranslation
});
me.attributeWindow.show();
me.attributeWindow.loadAttribute(record);
},
setRecord: function(record) {
this.record = record;
this.switchButton();
},
switchButton: function() {
var me = this;
me.hide();
if (me.backendAttributes.length <= 0 || !me.record) {
return;
}
me.show();
}
});
Ext.define('Shopware.grid.plugin.Attribute', {
extend: 'Ext.AbstractPlugin',
alias: [ 'plugin.grid-attributes' ],
requires: [ 'Ext.grid.column.Column' ],
table: null,
windowTitle: null,
allowTranslation: true,
backendAttributes: [],
createActionColumn: true,
init: function(grid) {
var me = this;
me.loadConfig(function() {
if (!Ext.isDefined(me.grid.view) || me.grid.view.isDestroyed === true) {
return;
}
if (me.grid.getStore()) {
me.grid.reconfigure(me.grid.getStore());
} else {
me.onReconfigure();
}
});
me.grid = grid;
me.grid.on('reconfigure', me.onReconfigure, me);
me.callParent(arguments);
},
loadConfig: function(callback) {
var me = this;
me.store = Ext.create('Shopware.store.AttributeConfig');
me.store.getProxy().extraParams = { table: me.table };
me.store.load(function(attributes) {
me.backendAttributes = me.filterAttributes(attributes);
me.grid.backendAttributes = me.backendAttributes;
callback();
});
},
filterAttributes: function(attributes) {
var me = this,
toDisplay = [];
Ext.each(attributes, function(attribute) {
if (attribute.get('displayInBackend')) {
toDisplay.push(attribute);
}
});
return toDisplay;
},
onReconfigure: function() {
var me = this, items = [], width = 0;
if (me.createActionColumn === false) {
return;
}
if (me.backendAttributes.length <= 0) {
return;
}
var actionColumn = me.getActionColumn();
if (actionColumn) {
items = actionColumn.items;
width = actionColumn.width;
}
if (actionColumn) {
me.grid.headerCt.remove(actionColumn);
}
if (!me.hasAttributeColumn(items)) {
items.push(me.createActionColumnItem());
width += 30;
}
actionColumn = Ext.create('Ext.grid.column.Action', {
width: width,
items: items
});
me.grid.headerCt.insert(actionColumn);
},
hasAttributeColumn: function(items) {
var exist = false;
Ext.each(items, function(item) {
if (item.name == 'grid-attribute-plugin') {
exist = true;
return true;
}
});
return exist;
},
createActionColumnItem: function() {
var me = this;
return {
iconCls: 'sprite-attributes',
name: 'grid-attribute-plugin',
handler: function (view, rowIndex, colIndex, item, opts, record) {
me.actionColumnClick(record);
},
getClass: me.columnRenderer
};
},
columnRenderer: function(value, meta, record) {
if (!record.get('id')) {
return 'x-hidden';
}
},
getActionColumn: function() {
var me = this;
var columns = me.grid.headerCt;
var actionColumn = null;
columns.items.each(function(column) {
if (column.getXType() === 'actioncolumn') {
actionColumn = column;
return true;
}
});
return actionColumn;
},
actionColumnClick: function(record) {
var me = this;
me.attributeWindow = Ext.create('Shopware.attribute.Window', {
table: me.table,
title: me.windowTitle,
record: record,
allowTranslation: me.allowTranslation
});
me.attributeWindow.show();
}
});
Ext.define('Shopware.apps.Base.model.CustomSorting', {
extend: 'Shopware.data.Model',
configure: function() {
return {
controller: 'CustomSorting'
};
},
fields: [
{ name: 'id', type: 'int' },
{ name: 'label', type: 'string' },
{ name: 'active', type: 'boolean' },
{ name: 'displayInCategories', type: 'boolean' },
{ name: 'position', type: 'int' },
{ name: 'sortings', type: 'array' }
]
});
Ext.define('Shopware.apps.Base.store.CustomSorting', {
extend: 'Shopware.store.Listing',
sorters: [{
property: 'position',
direction: 'ASC'
}],
configure: function() {
return {
controller: 'CustomSorting'
};
},
model: 'Shopware.apps.Base.model.CustomSorting'
});
Ext.define('Shopware.apps.Base.model.CustomFacet', {
extend: 'Shopware.data.Model',
configure: function() {
return {
controller: 'CustomFacet'
};
},
fields: [
{ name: 'id', type: 'int' },
{ name: 'name', type: 'string' },
{ name: 'active', type: 'boolean' },
{ name: 'displayInCategories', type: 'boolean' },
{ name: 'deletable', type: 'boolean', defaultValue: true },
{ name: 'position', type: 'int' },
{ name: 'facet', type: 'string' }
]
});
Ext.define('Shopware.apps.Base.store.CustomFacet', {
extend: 'Shopware.store.Listing',
sorters: [{
property: 'position',
direction: 'ASC'
}],
configure: function() {
return {
controller: 'CustomFacet'
};
},
model: 'Shopware.apps.Base.model.CustomFacet'
});
Ext.define('Shopware.helper.BatchRequests', {
start: function(requests, callback) {
this.prepareRequest(
requests.shift(),
requests,
callback
);
},
prepareRequest: function(request, requests, callback) {
this.send(request, requests, callback);
},
send: function(request, requests, callback) {
var me = this;
if (!request.params.hasOwnProperty('iteration')) {
request.params.iteration = 0;
}
request.params.iteration++;
Ext.Ajax.request({
url: request.url,
params: request.params,
success: function(operation) {
me.handleResponse(request, operation, requests, callback);
}
});
},
handleResponse: function(request, operation, requests, callback) {
var me = this;
var response = Ext.decode(operation.responseText);
me.updateProgressBar(request, response);
if (me.cancelProcess) {
me.canceled();
return true;
}
if (response.hasOwnProperty('params')) {
Ext.Object.merge(request.params, response.params);
}
if (response.finish == false) {
return me.send(request, requests, callback);
}
if (requests.length <= 0) {
return me.finish(requests, callback);
}
request = requests.shift();
return me.prepareRequest(request, requests, callback);
},
updateProgressBar: function(request, response) { },
finish: function(requests, callback) {
if (Ext.isFunction(callback)) {
Ext.callback(callback);
}
},
canceled: function() { },
cancel: function() {
this.cancelProcess = true;
}
});
Ext.define('Shopware.apps.Base.store.SheSalutation', {
    override: 'Shopware.apps.Base.store.Salutation',
    listeners: {
        load: function(store){
            var rec = { id: 0, key: '', label: '-' };
            store.insert(0, rec);
        }
    }
});
