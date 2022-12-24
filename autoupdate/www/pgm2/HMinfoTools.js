FW_version["HMinfoTools.js"] = "$Id: HMinfoTools.js 2011 2022-12-23 12:15:10Z frank $";

var HMinfoTools_debug = true;
var HMinfoTools_csrf;
var HMinfoTools_devMap = new Map();
function HMinfoTools_initMapDevice(device) {
	var devObj = {name: device, 
								parentDev: '', 
								alias: '', 
								errors: [], 
								model: '',
								commState: '',
								rssi: '',
								IODev: '',
								aIODev: '',
								IOgrp: '',
								cfgState: '',
								actCycle: '',
								actStatus: '',
								activity: '',
								battery: '',
								batNotOkCtr: '',
								motorErr: '',
								sabotageError: '',
								sabotageAttack: '',
								smokeDetect: ''
	};
	HMinfoTools_devMap.set(device,devObj);
}
var HMinfoTools_icons = [
	{name: 'commState',poll: 'parent',svg: 'rc_dot',colorElements: ['path'],clickG: 'clearG msgErrors',click: 'HMinfoTools_setClearMsgEvents'},
	{name: 'rssi',poll: 'parent',svg: 'it_wifi',colorElements: ['g'],clickG: 'clearG rssi',click: 'HMinfoTools_setClearRssi'},
	{name: 'IODev',poll: 'parent',svg: 'cul_868',colorElements: ['g'],clickG: '',click: ''},
	{name: 'cfgState',poll: 'device',svg: 'edit_settings',colorElements: ['g'],clickG: '',click: 'HMinfoTools_setGetConfig'},
	{name: 'Activity',poll: 'parent',svg: 'message_attention',colorElements: ['path'],clickG: 'cmdRequestG ping',click: ''},
	{name: 'battery',poll: 'parent',svg: 'measure_battery_75',colorElements: ['g'],clickG: '',click: 'HMinfoTools_setBatteryChange'},
	{name: 'motorErr',poll: 'device',svg: 'sani_domestic_waterworks',colorElements: ['g'],clickG: '',click: ''},
	{name: 'sabotageError',poll: 'device',svg: 'secur_locked',colorElements: ['g'],clickG: '',click: ''},
	{name: 'sabotageAttack',poll: 'parent',svg: 'ring',colorElements: ['polygon','path','rect'],clickG: 'clearG attack',click: 'HMinfoTools_setClearAttack'},
	{name: 'smokeDetect',poll: 'device',svg: 'secur_smoke_detector',colorElements: ['g'],clickG: '',click: ''}
];

$(document).ready(function() {
	var body = document.querySelector('body');
	if(body != null) {HMinfoTools_csrf = body.getAttribute('fwcsrf');}
	var seldiv = document.querySelector('div.makeSelect'); 
	var weblinkdiv = document.getElementById('hminfotools_weblink'); 
	if(seldiv != null) {
		var hminfo = seldiv.getAttribute('dev');
		HMinfoTools_parseErrorDevices(hminfo,weblinkdiv);
	}
	else if(weblinkdiv != null) {
		var hminfo = weblinkdiv.getAttribute('dev');
		HMinfoTools_parseErrorDevices(hminfo,weblinkdiv);
	}
});

function HMinfoTools_getAllRssiData() {
	var hminfo = $('#hminfotools').attr('device');
	var cmd = 'get ' +hminfo+ ' rssiG full';
	if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
	var url = HMinfoTools_makeCommand(cmd);
	$.get(url,function(data) {
		if(data != null) {
		/*
		rssiG done:
    Device          receive         from             last   avg      min_max    count
    DimUP01         DimUP01         cul868           -59.0  -58.7  -59.0< -58.0     3
    DimUP01         DimUP01         hmlan1           -62.0  -63.6  -66.0< -62.0    12
    DimUP01         cul868          DimUP01          -62.0  -61.8  -63.0< -60.5    15
    DimUP01         hmlan1          DimUP01          -62.0  -62.1  -67.0< -61.0    15
    DimUP01         hmuart1         DimUP01          -60.0  -58.2  -60.0< -57.0    12
		*/
			var rssiMap = new Map();
			var lines = data.split('\n');
			for(var l = 2; l < lines.length; ++l) {
				var line = lines[l];
				var match = line.match(/^\s*([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^<]+)<\s+([^\s]+)\s*([^\s]+)\s*$/);
				if(match != null) {
					var device = match[1];
					var rssiObj = {};
					rssiObj.to = match[2];
					rssiObj.from = match[3];
					rssiObj.lst = match[4];
					rssiObj.avg = match[5];
					rssiObj.min = match[6];
					rssiObj.max = match[7];
					rssiObj.cnt = match[8];
					var rssiDevObj = {};
					if(rssiMap.has(device)) {
						rssiDevObj = rssiMap.get(device);
						rssiDevObj.rssiArr.push(rssiObj);
					}
					else {
						rssiDevObj.rssiArr = [rssiObj];
					}
					rssiMap.set(device,rssiDevObj);
				}
			}
			
			var div = $("<div id='HMinfoTools_Dialog'>");
			$(div).html('rssi table' + '<br><br>');
			$("body").append(div);
			//$(div).tooltip({color: 'red'});
			// rssi table
			var table = document.createElement('table');
			$(div).append(table);
			table.id = 'HMinfoTools_rssiTable';
			table.style.margin = '10px 0px 0px 0px';
			var thead = document.createElement('thead');
			table.appendChild(thead);
			var row = document.createElement('tr');
			thead.appendChild(row);
			row.id = 'HMinfoTools_rssiTable_header';
			var headerList = ['device','receive','from','last','min','avg','max','count',
												'delta<br>minMax','delta<br>avgMax','delta<br>avgAvg','IODev<br>ranking','IOgrp<br>setting'];
			for(var h = 0; h < headerList.length; ++h) {
				var thCol = document.createElement('th');
				row.appendChild(thCol);
				//thCol.setAttribute('scope','col');
				if(h > 2) {thCol.align = 'center';}
				thCol.innerHTML = headerList[h];
			}
			var tbody = document.createElement('tbody');
			table.appendChild(tbody);
			tbody.style.color = '#CCCCCC';
			var deviceCnt = 0;
			rssiMap.forEach(function(value,key,map) {
				++deviceCnt;
				var curIODev = (HMinfoTools_devMap.has(key))? HMinfoTools_devMap.get(key).IODev: '';
				var curIOgrp = (HMinfoTools_devMap.has(key) && HMinfoTools_devMap.get(key).IOgrp != 'missing_IOgrp')? HMinfoTools_devMap.get(key).IOgrp: '';
				var curVccu = curIOgrp.replace(/:.+$/,'');
				var curVccuIoArr = (curVccu != '')? $('#hminfotools').attr('vcculist').match('(?<=^'+curVccu+':|\\s'+curVccu+':)[^\\s]+')[0].split(','): [];

				var devObj = map.get(key);
				//sort rssi-out-stat for io ranking => 1. high cnt, 2. high avg
				var rssiOutRankingArr = devObj.rssiArr.filter(item => item.to != key);
				rssiOutRankingArr.sort((a,b) => {
					var c1 = parseInt(a.cnt);
					var c2 = parseInt(b.cnt);
					var a1 = parseFloat(a.avg);
					var a2 = parseFloat(b.avg);
					if(c1 < c2) return 1; 
					if(c1 > c2) return -1; 
					if(a1 < a2) return 1; 
					if(a1 > a2) return -1; 
					return 0;
				});
				for(var r = 0; r < devObj.rssiArr.length; ++r) {
					var row = document.createElement('tr');
					tbody.appendChild(row);
					row.id = 'HMinfoTools_rssiTable_row_' +key+ '_r' + r;
					row.style.backgroundColor = (deviceCnt%2 == 0)? '#333333': '#111111';
					//row header
					var c0 = document.createElement('td');
					row.appendChild(c0);
					var color = 'lightblue';
					if(r == 0) {c0.innerHTML = '<a href="/fhem?detail=' +key+ '"><span style="color: '+color+';">' +key+ '</span></a>';}
					var c1 = document.createElement('td');
					row.appendChild(c1);
					c1.align = 'left';
					color = '#CCCCCC';
					c1.innerHTML = '<a href="/fhem?detail=' +devObj.rssiArr[r].to+ '"><span style="color: '+color+';">' +devObj.rssiArr[r].to+ '</span></a>';
					var c2 = document.createElement('td');
					row.appendChild(c2);
					c2.align = 'left';
					var fromDevName = devObj.rssiArr[r].from.replace(/\/.+$/,'');
					c2.innerHTML = '<a href="/fhem?detail=' +fromDevName+ '"><span style="color: '+color+';">' +devObj.rssiArr[r].from+ '</span></a>';
					var c3 = document.createElement('td');
					row.appendChild(c3);
					c3.align = 'right';
					c3.innerHTML = devObj.rssiArr[r].lst;
					var c4 = document.createElement('td');
					row.appendChild(c4);
					c4.align = 'right';
					c4.style.color = doColorAbs(devObj.rssiArr[r].min);
					c4.innerHTML = devObj.rssiArr[r].min;
					var c5 = document.createElement('td');
					row.appendChild(c5);
					c5.align = 'right';
					if(curIODev == devObj.rssiArr[r].to || curIODev == devObj.rssiArr[r].from) {c5.style.backgroundColor = '#888888';}
					c5.style.color = doColorAbs(devObj.rssiArr[r].avg);
					c5.innerHTML = devObj.rssiArr[r].avg;
					var c6 = document.createElement('td');
					row.appendChild(c6);
					c6.align = 'right';
					c6.style.color = doColorAbs(devObj.rssiArr[r].max);
					c6.innerHTML = devObj.rssiArr[r].max;
					var c7 = document.createElement('td');
					row.appendChild(c7);
					c7.align = 'right';
					c7.innerHTML = devObj.rssiArr[r].cnt;
					var c8 = document.createElement('td');
					row.appendChild(c8);
					c8.align = 'right';
					c8.style.color = doColorDiff(Math.abs(devObj.rssiArr[r].min-devObj.rssiArr[r].max).toFixed(1));
					c8.innerHTML = (devObj.rssiArr[r].min-devObj.rssiArr[r].max).toFixed(1);
					var c9 = document.createElement('td');
					row.appendChild(c9);
					c9.align = 'right';
					c9.style.color = doColorDiff(Math.abs(devObj.rssiArr[r].avg-devObj.rssiArr[r].max).toFixed(1));
					c9.innerHTML = (devObj.rssiArr[r].avg-devObj.rssiArr[r].max).toFixed(1);
					var c10 = document.createElement('td');
					row.appendChild(c10);
					c10.align = 'right';
					if(devObj.rssiArr[r].to == key) {
						var avg1 = devObj.rssiArr[r].avg;
						var io = devObj.rssiArr[r].from;
						devObj.rssiArr.forEach((rssiToIO) => {
							if(rssiToIO.to != key) {
								var test = rssiToIO.cnt; //for testing
							}
							if(rssiToIO.to == io) {
								var avg2 = rssiToIO.avg;
								c10.style.color = doColorDiff(Math.abs(avg1-avg2).toFixed(1));
								c10.innerHTML = (avg1-avg2).toFixed(1);
							}
						});
					}
					//io ranking
					var c11 = document.createElement('td');
					row.appendChild(c11);
					c11.align = 'center';
					if(devObj.rssiArr[r].to != key) {
						rssiOutRankingArr.forEach((rssiToIO,index) => {
							if(rssiToIO.to == devObj.rssiArr[r].to) {
								c11.style.color = (index == 0 && curIODev == devObj.rssiArr[r].to && curVccuIoArr.includes(devObj.rssiArr[r].to))
																			? 'lime'
																			: (curIODev == devObj.rssiArr[r].to && curVccuIoArr.includes(devObj.rssiArr[r].to))
																				? 'orange'
																				: (curIODev == devObj.rssiArr[r].to && curVccuIoArr.length > 0 && !curVccuIoArr.includes(devObj.rssiArr[r].to))
																					? 'red'
																					: '';
								c11.innerHTML =  (index+1) + '.';
							}
						});
					}
					//IOgrp recommondation
					var c12 = document.createElement('td');
					row.appendChild(c12);
					c12.align = 'center';
					c12.style.whiteSpace = 'nowrap';
					if(r == (devObj.rssiArr.length - rssiOutRankingArr.length) && curIOgrp != '') { //first row of rssiOut
						var input = document.createElement('input');
						c12.appendChild(input);
						input.type = 'text';
						input.id = 'IOgrp_inp_' + key;
						input.disabled = true;
						input.placeholder = curIOgrp;
						input.setAttribute('orgvalue',curIOgrp);
						input.style.margin = '0px 0px 0px 0px';
						input.style.width = '140px';
//						input.title = '<span style="color: red;">current IOgrp => ' +curIOgrp+ '</span>';
						input.title = 'current IOgrp => ' +curIOgrp;
						input.setAttribute('onchange','HMinfoTools_updateChangedValues("'+input.id+'")');
						
						var val = curVccu + ':';
						var curNoneArr = curIOgrp.match(/,none$/)? curIOgrp.replace(/^.+:/,'').replace(/,none$/,'').split(','): [];
						var prefCnt = 0;
						var prefCntMax = (rssiOutRankingArr.length < 3)? rssiOutRankingArr.length: 2;
						if(prefCntMax > curVccuIoArr.length) {prefCntMax = curVccuIoArr.length;}
						var extraLoop = 0;
						for(var p = 0; p < (prefCntMax + extraLoop); ++p) {
							if(!curVccuIoArr.includes(rssiOutRankingArr[p].to) || curNoneArr.length && !curNoneArr.includes(rssiOutRankingArr[p].to)) {
								if((prefCntMax + extraLoop) < rssiOutRankingArr.length) {extraLoop += 1};
								continue;
							}
							if(val.match(/:$/)) {val += rssiOutRankingArr[p].to;}
							else {val += ',' + rssiOutRankingArr[p].to;}
							prefCnt += 1;
						}
						if(curNoneArr.length) {val += ',none';}
						if(!prefCnt || prefCnt < curNoneArr.length) {val = curIOgrp;} //no recommondation
						if(val != curIOgrp) {input.setAttribute('class','changed');}
						input.value = val;
						
						var check = document.createElement('input');
						c12.appendChild(check);
						check.type = 'checkbox';
						check.id = 'IOgrp_check_' + key;
						check.checked = false;
						check.style.margin = '10px 0px 0px 0px';
						check.title = 'check => enable IOgrp setting';
						check.style.cursor = 'pointer';
						check.setAttribute('onchange','HMinfoTools_enableSetIOgrp("'+key+'")');
					}
				}
			});
			function doColorAbs(rssi) {
				var color = 'lightblue';
				if(-80 < rssi) {color = 'lime';}
				else if(-90 <  rssi && rssi <= -80) {color = 'yellow';}
				else if(-99 <= rssi && rssi <= -90) {color = 'orange';}
				else if(rssi < -99) {color = 'red';}
				return color;
			}
			function doColorDiff(rssi) {
				var color = 'blue';
				if(5 > rssi) {color = 'lime';}
				else if(10 > rssi && rssi >= 5) {color = 'yellow';}
				else if(15 > rssi && rssi >= 10) {color = 'orange';}
				else if(rssi >= 15) {color = 'red';}
				return color;
			}
			function doAllOnOff(opt) {
				$("[id^='IOgrp_check_']").each(function() {
					var inp = document.getElementById(this.id.replace(/check/,'inp'));
					if(opt && inp.getAttribute('orgvalue') != inp.value) {this.checked = true;}
					else {this.checked = false;}
					HMinfoTools_enableSetIOgrp(this.id.replace(/IOgrp_check_/,''))
				});
			}
			function doSetIOgrp() {
				// check for enabled devices and set attributes
				var cmd = '';
				$("[id^='IOgrp_check_']").each(function() {
					if(this.checked) {
						var inp = document.getElementById(this.id.replace(/check/,'inp'));
						if(inp.getAttribute('orgvalue') != inp.value && inp.value != '') {
							var device = inp.id.replace(/IOgrp_inp_/,'');
							cmd += 'attr ' +device+ ' IOgrp ' +inp.value+ ';';
						}
					}
				});
				var url = HMinfoTools_makeCommand(cmd);
				if(cmd != '') {
					if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
					$.get(url, function(data){
						if(data) {FW_okDialog(data);}
						else {
							$(div).dialog('close'); 
							location.reload();
						}
					});
				}
				else {FW_okDialog('No changed attributes enabled, nothing to do');}
			}
			function doClose() {
				$(div).dialog('close'); 
				$(div).remove();
			}
			$(div).dialog({ dialogClass:'no-close', modal:true, width:$('#HMinfoTools_rssiTable').width()*1.1, closeOnEscape:true, 
											maxWidth:$(window).width()*0.9, maxHeight:$(window).height()*0.9,
											//maxWidth:$(window).width()*0.9, height: 'auto+20', 
											buttons: [{text:'All Changed On', click:function(){doAllOnOff(true);}},
																{text:'All Off', click:function(){doAllOnOff(false);}},
																{text:'Set IOgrp', click:function(){doSetIOgrp();}},
																{text:'Cancel', click:function(){doClose();}}]
			});
		}
	});
}
function HMinfoTools_updateChangedValues(id) {
	var inp = document.getElementById(id);
	if(inp.getAttribute('orgvalue') != inp.value) {inp.setAttribute('class','changed');}
	else {inp.removeAttribute('class','changed');}
}
function HMinfoTools_enableSetIOgrp(device) {
	document.getElementById('IOgrp_inp_'+device).disabled = (document.getElementById('IOgrp_check_'+device).checked? false: true);
}
function HMinfoTools_setAttrIOgrp() {
}

/*
*/

function HMinfoTools_parseDevFromJson(device,data) {
	var devObj = HMinfoTools_devMap.get(device);
	//parentDev
	devObj.parentDev = (data.Internals.DEF.length == 6)? data.Internals.NAME: data.Internals.device;
	//alias
	if(data.Attributes.alias != null) {devObj.alias = data.Attributes.alias};
	//model
	devObj.model = (data.Attributes.model != null && data.Attributes.model != '')? data.Attributes.model: 'missing_model';
	//commState
	devObj.commState = (data.Readings.commState != null)? data.Readings.commState.Value: 'Info_Unknown';
	//rssi
	internalsString = JSON.stringify(data.Internals);
	var curIoDev = (data.Internals.IODev != null && !data.Internals.IODev.match(/^HASH\(/))
										? data.Internals.IODev
										: 'missing_IODev';
	devObj.rssi = 'rssi_at_'+curIoDev+' => ' + ((internalsString.match('rssi_at_'+curIoDev))
																								? data.Internals['rssi_at_'+curIoDev]
																								: 'missing_rssi');
	//IODev
	devObj.IODev = (data.Internals.IODev != null)? data.Internals.IODev: 'missing_IODev';
	//aIODev
	devObj.aIODev = (data.Attributes.IODev != null)? data.Attributes.IODev: 'missing_aIODev';
	//IOgrp
	devObj.IOgrp = (data.Attributes.IOgrp != null)? data.Attributes.IOgrp: 'missing_IOgrp';
	//cfgState
	devObj.cfgState = (data.Readings.cfgState != null)? data.Readings.cfgState.Value: 'Info_Unknown';
	//actCycle
	devObj.actCycle = (data.Attributes.actCycle != null)? data.Attributes.actCycle: 'unknown';
	//actStatus
	devObj.actStatus = (data.Attributes.actStatus != null)? data.Attributes.actStatus: 'unknown';
	//activity
	if(data.Attributes.actCycle != null) {
		if(data.Attributes.actCycle == '000:00') {devObj.activity = 'switchedOff';}
		else {devObj.activity = (data.Attributes.actStatus != null)? data.Attributes.actStatus: 'unknown';}
	}
	else {devObj.activity = 'unused';}
	//battery
	if(data.Readings.battery != null) {devObj.battery = data.Readings.battery.Value;}
	//batNotOkCtr
	if(data.Readings.batNotOkCtr != null) {devObj.batNotOkCtr = data.Readings.batNotOkCtr.Value;}
	//motorErr
	if(data.Readings.motorErr != null) {devObj.motorErr = data.Readings.motorErr.Value;}
	//sabotage
	if(data.Readings.sabotageError != null) {devObj.sabotageError = data.Readings.sabotageError.Value;}
	//attack
	if(data.Readings.sabotageAttack_ErrIoAttack_cnt != null) {devObj.sabotageAttack = data.Readings.sabotageAttack_ErrIoAttack_cnt.Value;}
	//smokeDetect
	if(data.Readings.smoke_detect != null) {devObj.smokeDetect = data.Readings.smoke_detect.Value;}
	
	HMinfoTools_devMap.set(device,devObj);
}
function HMinfoTools_parseErrorDevices(hminfo,weblinkdiv) {
	var cmd = 'jsonlist2 ' + hminfo;
	if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
	var url = HMinfoTools_makeCommand(cmd);
	$.getJSON(url).done(function(data) {
		var object = data.Results[0];
		if(object != null && object.Internals.TYPE == 'CUL_HM' && object.Attributes.model != 'ACTIONDETECTOR') {//for cul_hm device_details (hm.js)
			if(typeof HMdeviceTools_createRegisterTable == 'function') { 
				if(HMinfoTools_debug) {log('HMinfoTools: ' + 'HMdeviceTools is present');}
				var isHMdeviceTools = false;
				var isHMdeviceTools_pendingInfo = false;
			
				//install mutationObserver to manage perfect handling
				const observer3 = new MutationObserver(function(mutationList,observer) {
					mutationList.forEach((mutation) => {
						if(mutation.type == 'attributes' && mutation.target == document.getElementById('HMdeviceTools_toolsTable')){

							if(mutation.attributeName == 'installation') {
								if(mutation.oldValue == null) { //value=init
									if(HMinfoTools_debug) {log('HMinfoTools: ' + 'HMdeviceTools => started installation');}
								}
								else if(mutation.oldValue == 'init') { //value=ready
									isHMdeviceTools = true;
									if(HMinfoTools_debug) {log('HMinfoTools: ' + 'HMdeviceTools => finished installation');}
									HMinfoTools_loadIcons(object.Internals.NAME,document.getElementById('HMdeviceTools_toolsTable_svg'));
									$('#HMdeviceTools_toolsTable').attr('errordevices_data','start'); //1. run (allready done)
									$('#HMdeviceTools_toolsTable').attr('errordevices_data','first'); //1. run (allready done)
									$('#HMdeviceTools_toolsTable').attr('errordevices_list',object.Internals.NAME);
									if(isHMdeviceTools_pendingInfo && object.Internals.DEF.length == 8) {
										$('#HMdeviceTools_toolsTable').attr('errordevices_list',(object.Internals.NAME+':'+data.Results[0].Internals.NAME));
										$('#HMdeviceTools_toolsTable').attr('errordevices_data','ready'); //2. run (allready done)
									}
									else if(object.Internals.DEF.length == 6) {
										$('#HMdeviceTools_toolsTable').attr('errordevices_data','ready'); //only 1. run (allready done)
									}
								}
							}				
						
							var isInstallationReady = ($('#HMdeviceTools_toolsTable').attr('installation') == 'ready')? true: false;
							var areIconsLoaded = ($('#HMdeviceTools_toolsTable').attr('loaded_icons') == HMinfoTools_icons.length)? true: false;
							//var isErrDataFirst = ($('#HMdeviceTools_toolsTable').attr('errordevices_data') == 'first')? true: false;
							var isErrDataReady = ($('#HMdeviceTools_toolsTable').attr('errordevices_data') == 'ready')? true: false;
							
							if(isInstallationReady && areIconsLoaded && isErrDataReady) { //all icons and infos loaded
								observer3.disconnect();
								var errorList = $('#HMdeviceTools_toolsTable').attr('errordevices_list');
								var errorDevices = errorList.split(':')[0];
								if(errorDevices != '') {
									if(HMinfoTools_debug) {log('HMinfoTools: ' + 'HMdeviceTools => all data ready');}
									HMinfoTools_createIconCells(document.getElementById('HMdeviceTools_toolsTable_icons'),object.Internals.NAME); 
									HMinfoTools_initIcons(object.Internals.NAME); 
									var informDevices = (errorList.match(/:$/))? errorList.replace(/:$/,''): errorList.replace(/:/,',');
									if(informDevices != object.Internals.NAME) {
										setTimeout(HMinfoTools_changeInformChannel(informDevices),1000);
									}
								}
							}
						}
					});
				});
				observer3.observe(document.body,{subtree: true,
																				 childList: false,
																				 attributeFilter: ['installation','loaded_icons','errordevices_data'],
																				 attributeOldValue: true}
				);

				HMinfoTools_initMapDevice(object.Internals.NAME);
				HMinfoTools_parseDevFromJson(object.Internals.NAME,object);
				if(object.Internals.DEF.length == 8) {
					var cmd = 'jsonlist2 ' + object.Internals.device;
					if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
					var url = HMinfoTools_makeCommand(cmd);
					$.getJSON(url,function(data) {
						if(data.Results[0] != null) {
							HMinfoTools_initMapDevice(data.Results[0].Internals.NAME);
							HMinfoTools_parseDevFromJson(data.Results[0].Internals.NAME,data.Results[0]);
							if(isHMdeviceTools) {
								$('#HMdeviceTools_toolsTable').attr('errordevices_list',(object.Internals.NAME+':'+data.Results[0].Internals.NAME));
								$('#HMdeviceTools_toolsTable').attr('errordevices_data','ready'); //2. run (allready done)
							}
							else {isHMdeviceTools_pendingInfo = true;}
						}
					});
				}
				if(document.getElementById('HMdeviceTools_toolsTable') != null && $('#HMdeviceTools_toolsTable').attr('installation') == 'ready') {
					isHMdeviceTools = true;
					if(HMinfoTools_debug) {log('HMinfoTools: ' + 'HMdeviceTools => is ready');}
					HMinfoTools_loadIcons(hminfo,document.getElementById('HMdeviceTools_toolsTable_svg'));
					$('#HMdeviceTools_toolsTable').attr('errordevices_data','start'); //1. run (allready done)
					$('#HMdeviceTools_toolsTable').attr('errordevices_data','first'); //1. run (allready done)
					$('#HMdeviceTools_toolsTable').attr('errordevices_list',object.Internals.NAME); //1. run (allready done)
					if(object.Internals.DEF.length == 6) {
						$('#HMdeviceTools_toolsTable').attr('errordevices_data','ready'); //only 1. run (allready done)
					}
				}
				else {
				}
			}
		}
		else if(object != null && object.Internals.TYPE == 'HMinfo') {                                          //for hminfo_details or weblink
			if(document.getElementById('hminfotools') == null) { // 1. run, we want to install basic things
				var lastChange = ((object.Readings.lastErrChange == null)? 
													'updated: Info_Unknown': object.Readings.lastErrChange.Value);
				HMinfoTools_createHMinfoTools(hminfo,weblinkdiv,lastChange);
				$('#hminfotools').attr('device_mode',((object.Attributes.HMinfoTools_deviceMode == null)
																								? ''
																								: object.Attributes.HMinfoTools_deviceMode));
				var check = document.getElementById('hminfo_allDev_check');
				check.checked = ($('#hminfotools').attr('device_mode') == 'all')? true: false;
				var checkCell = document.getElementById('hminfo_allDev');
				checkCell.hidden = ($('#hminfotools').attr('device_mode') == '')? true: false;
				var ssAttr = ((object.Attributes.HMinfoTools_screenshotPort == null)? 
													'': object.Attributes.HMinfoTools_screenshotPort);
				var ssArgs = ssAttr.split(',');
				$('#hminfotools').attr('ss_port',((ssArgs[0] != null)? ssArgs[0]: ''));
				$('#hminfotools').attr('ss_room',((ssArgs[1] != null)? ssArgs[1]: ''));
			}
			HMinfoTools_parseIOsFromHMinfo(object.Internals.iI_HM_IOdevices);
			
			/*search for entities with errors: CRI_, ERR_, W_ (sort order in hminfo internals)
			"iCRI__protocol":"SwitchPBU06",
			"iERR___rssiCrit":"Thermostat.Keller",
			"iERR__actDead":"SwitchUP01",
			"iERR__protocol":"Ventil.AZ.Nord,Ventil.AZ.West,Ventil.Bad,Ventil.Kueche,Ventil.WZ",
			"iERR_battery_low":"Thermostat.WZ",
			"iW__protoNames":"DimUP01",
			"iW__unreachNames":"DimPBU01_Sw1_V01,DimPBU01_Sw1_V02,SwitchPBU01_Sw_02"
			*/
			var errorDevices = '';
			var internalsString = JSON.stringify(object.Internals);
			var mErrorInternal = internalsString.match(/i(?:CRI_|ERR_|W_)[^"]+/g);
			if(mErrorInternal != null) {
				var cat1Arr = ["CRI","ERR","W"];
				var cat2Arr = ["_","__","___"]; //reverse to hminfo internals order
				var nameArr = ["actDead","protocol","rssiCrit","unreachNames","protoNames"];
				var sumErrArr = ((object.Attributes.sumERROR != null)? object.Attributes.sumERROR.match(/(?:^|,)[^:]+/g): []); 
				sumErrArr.forEach((reading, idx, arr) => {arr[idx] = reading.replace(/[\,\n]/g,'');});
				var mErrorInternalSorted = mErrorInternal.map((err) => {
					var test = err.match(/^i([^_]+)([_]+)(.+)$/);
					var cat3Val = 99;
					var errName = '';
					var errVal = '';
					var errType = 'string';
					if(nameArr.includes(test[3])) {
						cat3Val = nameArr.indexOf(test[3]);
						errName = test[3];
					}
					else {
						cat3Val = sumErrArr.findIndex((reading) => {
							var r = test[3].substring(0,reading.length);
							return (reading == r);
						});
						errName = sumErrArr[cat3Val];
						errVal = test[3].replace(errName+'_','');
						if(errVal == +errVal) {
							errVal = parseInt(errVal);
							errType = 'integer';
						}
					}
					return { cat1:  cat1Arr.indexOf(test[1]),
									 cat2:  cat2Arr.indexOf(test[2]),
									 cat3:  cat3Val,
									 name:  errName, 
									 value: errVal, 
									 vType: errType, 
									 error: err}; 
				});
				mErrorInternalSorted.sort((a,b) => {
					if(a.cat1 > b.cat1) {return 1;}
					if(a.cat1 < b.cat1) {return -1;}
					if(a.cat2 > b.cat2) {return 1;}
					if(a.cat2 < b.cat2) {return -1;}
					if(a.cat3 > b.cat3) {return 1;}
					if(a.cat3 < b.cat3) {return -1;}
					if(a.vType === 'integer' && b.vType === 'integer') {
						if(a.value < b.value) {return 1;}
						if(a.value > b.value) {return -1;}
					}
					if(a.value > b.value) {return 1;}
					if(a.value < b.value) {return -1;}
					return 0;
				});
				var result = mErrorInternalSorted.map((item) => {return item.error;});
				
				for(var i = 0; i < result.length; ++i) {
					if(object.Internals[result[i]] != undefined) {
						var devices = object.Internals[result[i]].split(','); 
						for(var d = 0; d < devices.length; ++d) {
							var devObj = {};
							if(!HMinfoTools_devMap.has(devices[d])) {
								//errorDevices += devices[d] +',';
								HMinfoTools_initMapDevice(devices[d]);
								devObj = HMinfoTools_devMap.get(devices[d]);
								devObj.errors = [result[i]];
							}
							else {
								devObj = HMinfoTools_devMap.get(devices[d]);
								devObj.errors.push(result[i]);
							}
							HMinfoTools_devMap.set(devices[d],devObj);
						}
					}
				}
				var devErrArr = [];
				HMinfoTools_devMap.forEach((value,key) => {
					devErrArr.push({name: key, errors: value.errors});
				});
				devErrArr.sort((a,b) => {
					var aL = a.errors.length;
					var bL = b.errors.length;
					var errMax = (aL > bL)? aL: bL;
					for(var e = 0; e < errMax; ++e) {
						var ax = result.indexOf(a.errors[e]);
						var bx = result.indexOf(b.errors[e]);
						if(ax != -1 && bx != -1) {
							if(ax > bx) {return 1;}
							if(ax < bx) {return -1;}
						}
						if(ax == -1 && bx != -1) {return 1;}
						if(ax != -1 && bx == -1) {return -1;}
					}
					return 0;		
				});
				devErrArr.forEach((device) => {
					errorDevices += device.name +',';
				});
			}
			if($('#hminfotools').attr('device_mode') == 'all') { //all devices w/o problems
				var cmd = 'list TYPE=CUL_HM:FILTER=DEF=......:FILTER=DEF!=000000 i:NAME';
				if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
				var url = HMinfoTools_makeCommand(cmd);
				$.get(url,function(data) {
					if(data != null) {
						//SwitchES01               SwitchES01
						var deviceList = '';
						var lines = data.split('\n');
						for(var l = 0; l < lines.length; ++l) {
							if(lines[l] != '') {
								var device = lines[l].match(/[^\s]+$/)[0];
								deviceList += device + ',';
								if(!HMinfoTools_devMap.has(device)) {
									errorDevices += device + ',';
									HMinfoTools_initMapDevice(device);
								}
							}
						}
						deviceList = deviceList.replace(/,$/,'');
						$('#hminfotools').attr('alldevices_list',deviceList);
						errorDevices = errorDevices.replace(/,$/,'');
						$('#hminfotools').attr('errordevices_list',errorDevices);
						if(errorDevices != '') {
							$('#hminfotools').attr('errordevices_data','start');
							HMinfoTools_getInfoFromErrorDevices('hminfotools'); //1. run (mode=allDevices)
						}
						else {
							$('#hminfotools').attr('errordevices_data','ready');
							HMinfoTools_changeInformChannel('');
							document.getElementById('hminfo_info').innerHTML = ' => waiting for problems...';
						}
					}
				});
			}
			else { //only devices with problems
				errorDevices = errorDevices.replace(/,$/,'');
				$('#hminfotools').attr('errordevices_list',errorDevices);
				if(errorDevices != '') {
					$('#hminfotools').attr('errordevices_data','start');
					HMinfoTools_getInfoFromErrorDevices('hminfotools'); //1. run (mode=errDevices)
				}
				else {
					$('#hminfotools').attr('errordevices_data','ready');
					HMinfoTools_changeInformChannel('');
					document.getElementById('hminfo_info').innerHTML = ' => waiting for problems...';
				}
			}			
		}
	})
	.fail(function(xhr,status,err) {
		if(xhr.status == 400 && typeof HMinfoTools_csrf != 'undefined') {
			HMinfoTools_csrf = '';
			location.reload();
		}
	});
}
function HMinfoTools_createHMinfoTools(hminfo,weblinkdiv,lastChange) {
	var div = document.createElement('div');
	var header;
	if(weblinkdiv == null) {
		// we will insert the table before the internals
		var intdiv = document.querySelector('div.makeTable.wide.internals');
		intdiv.parentElement.insertBefore(div,intdiv);
		header = intdiv.firstElementChild.cloneNode(false);
	}
	else {
		weblinkdiv.appendChild(div);
		header = document.createElement('span');
		header.setAttribute('class','col_header pinHeader detail_Internals');
	}
	div.id = 'hminfotools';
	div.setAttribute('device',hminfo);            // name of hminfo device
	div.setAttribute('installation','init');      // init, ready
	div.setAttribute('loaded_icons','init');      // 0_icons: "init"; 9_icons: "9"
	div.setAttribute('errordevices_data','init'); // init, start, first, ready
	div.setAttribute('errordevices_list','init'); // list of current errorDevices
	div.setAttribute('lost','0');                 // list of lost connections
	div.setAttribute('class','makeTable wide internals');	
	div.appendChild(header);
	header.innerHTML = '<a href="/fhem?detail=' +hminfo+ '">HMinfoTools</a>';
	
	const elementToObserve = div;
	const observer1 = new MutationObserver(function(mutationList,observer) {
		mutationList.forEach((mutation) => {
			if(mutation.type == 'attributes'){
				var isInstallationReady = ($('#hminfotools').attr('installation') == 'ready')? true: false;
				var areIconsLoaded = ($('#hminfotools').attr('loaded_icons') == HMinfoTools_icons.length)? true: false;
				var isErrDataFirst = ($('#hminfotools').attr('errordevices_data') == 'first')? true: false;
				var isErrDataReady = ($('#hminfotools').attr('errordevices_data') == 'ready')? true: false;
				
				if(isErrDataFirst) {HMinfoTools_getInfoFromErrorDevices('hminfotools');} //2. run
				
				if(isInstallationReady && areIconsLoaded && isErrDataReady) { //all icons and infos loaded
					var errorList = $('#hminfotools').attr('errordevices_list');
					var errorDevices = errorList.split(':')[0];
					var ioInfo = document.getElementById('hminfo_ios').innerHTML;
					if(errorDevices != '' && ioInfo != 'IO_Devices: Info_Unknown') {
						if(HMinfoTools_debug) {log('HMinfoTools: ' + 'all data ready, new table creation!');}
						HMinfoTools_createErrorDevicesTable(errorDevices);
						var informDevices = (errorList.match(/:$/))? errorList.replace(/:$/,''): errorList.replace(/:/,',');
						setTimeout(HMinfoTools_changeInformChannel(informDevices),1000);
						if(typeof html2canvas == 'function') {
							var curPort = location.port;
							var ssPort = $('#hminfotools').attr('ss_port');
							var curRoom = ($('div#content').attr('room') == undefined)? '': $('div#content').attr('room');
							var ssRoom = $('#hminfotools').attr('ss_room');
							if(curPort == ssPort && curRoom == ssRoom) {
								if(HMinfoTools_debug) {log('HMinfoTools: ' + 'sreenshot');}
								//connection-lost-dead-loop, wenn ss_port=8083 vom pc browser
								//scheinbar verzögert setTimeout hier die initialisierung des longpoll websocket!!!
								setTimeout(HMinfoTools_createScreenshot(),10000);
							}
						}
					}
					else {
						if(HMinfoTools_debug) {log('HMinfoTools: ' + 'all data ready, no table creation!');}
						if(weblinkdiv != null && ioInfo == 'IO_Devices: Info_Unknown'){
							//setTimeout(HMinfoTools_changeInformChannel(''),1000);
						}
					}
				}
			}
		});
	});	
	observer1.observe(div,{attributeFilter: ['installation','loaded_icons','errordevices_data']});
	
	const observer2 = new MutationObserver(function(mutationList,observer) {
		mutationList.forEach((mutation) => {
			if(mutation.type == 'childList' && mutation.addedNodes.length > 0) {
				var errmsg = document.getElementById('errmsg');
				//10:27:38.598 ERRMSG:Connection lost, trying a reconnect every 5 seconds.<
				if(errmsg != null && errmsg.innerHTML == 'Connection lost, trying a reconnect every 5 seconds.') {
					var lost = parseInt($('#hminfotools').attr('lost'));
					if(HMinfoTools_debug) {log('HMinfoTools: ' + '"Connection lost" detected! ('+lost+')');}
					if(lost > 5) {
						if(HMinfoTools_debug) {log('HMinfoTools: ' + 'close and open informchannel');}
						$('#hminfotools').attr('lost','0');
						location.reload(true);
					}
					else {$('#hminfotools').attr('lost',lost+1);}
				}
			}
		});
	});
	observer2.observe(document.body,{subtree: false,childList: true,attributes: false});

	var info = document.createElement('span');
	div.appendChild(info);
	info.id = 'hminfo_info';
	info.innerHTML = ' => waiting for problems...';
	var table = document.createElement('table');
	div.appendChild(table);
	table.id = 'devicetable';
	table.setAttribute('class','block wide internals');
	table.style.backgroundColor = '#333333';
	table.style.color = '#CCCCCC';
	var thead = document.createElement('thead');
	table.appendChild(thead);
	thead.style.backgroundColor = '#111111';
	var tr = document.createElement('tr');
	thead.appendChild(tr);
	var icons = document.createElement('td');
	tr.appendChild(icons);
	icons.style.whiteSpace = 'nowrap';
	HMinfoTools_loadIcons(hminfo,icons); //################################################################
	
	var td = document.createElement('td');
	tr.appendChild(td);	
	var ios = document.createElement('span');
	td.appendChild(ios);
	ios.id = 'hminfo_ios';
	
	var td = document.createElement('td');
	tr.appendChild(td);
	var left = document.createElement('td');
	td.appendChild(left);
	var change = document.createElement('span');
	left.appendChild(change);
	change.id = 'hminfo_change';
	change.style.whiteSpace = 'nowrap';
	//ioInfo = ioInfo.replace(vccu,'<a href="/fhem?detail='+vccu+'"><span style="color: lightblue;">'+vccu+'</span></a>');
	var click = "HMinfoTools_clickSetFunctionG('"+hminfo+"','update')";
	lastChange = lastChange.replace(/updated/,'<span title="on click => set '+hminfo+' update"'+
																	' onclick="'+click+'" style="color: lightblue; cursor: pointer;">updated</span>');
	change.innerHTML = lastChange;
	
	var right = document.createElement('td');
	td.appendChild(right);
	right.align = 'right';
	right.style.whiteSpace = 'nowrap';
	var edit = document.createElement('span');
	right.appendChild(edit);
	edit.id = 'hminfo_edit';
	edit.title = 'rssi overview';
	edit.style.cursor = 'pointer';
	edit.setAttribute('onclick','HMinfoTools_getAllRssiData()');
	var cmd = "{FW_makeImage('rc_SETUP@white')}";
	if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
	var url = HMinfoTools_makeCommand(cmd);
	$.ajax({
		url: url,
		type: "GET",
		context: edit,
		success: function(data){
			if(data) {
				this.innerHTML = data;
				$('#' +this.id+ ' svg').css('height','20px');
				$('#' +this.id+ ' svg').css('width','20px');
			}
		}
	});
	var allDev = document.createElement('span');
	right.appendChild(allDev);
	allDev.id = 'hminfo_allDev';
	allDev.hidden = true;
	var check = document.createElement('input');
	allDev.appendChild(check);
	check.id = 'hminfo_allDev_check';
	check.type = 'checkbox';
	check.checked = false;
	check.style.margin = '5px 0px 0px 0px';
	check.title = 'check => "attr ' +hminfo+' HMinfoTools_deviceMode all"';
	check.style.cursor = 'pointer';
	check.setAttribute('onclick','HMinfoTools_setAttrDeviceMode()');
	
	var tbody = document.createElement('tbody');
	table.appendChild(tbody);
	tbody.id = 'hminfo_table_errDev';

	$('#hminfotools').attr('installation','ready');
}
function HMinfoTools_setAttrDeviceMode() {
	var hminfo = $('#hminfotools').attr('device');
	var val = ($('#hminfotools').attr('device_mode') == 'all')? 'err': 'all';
	var cmd = 'attr ' +hminfo+ ' HMinfoTools_deviceMode ' + val;
	if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
	var url = HMinfoTools_makeCommand(cmd);
	$.get(url,function(data) {
		if(data) {FW_okDialog(data);}
		else {location.reload();}
	});
}
function HMinfoTools_parseIOsFromHMinfo(ioInfoRaw) {
	var vcculist = '';
	var iolist = '';
	var ioInfo = ioInfoRaw;
	
	if(ioInfoRaw != null && !ioInfoRaw.match(/>/)) { //old hminfo version
		FW_okDialog('An update for 98_HMinfo.pm is needed!<br><br>'+
		            'patch for TSCUL users see forum:<br>'+
								'<a href="https://forum.fhem.de/index.php/topic,124095.0.html">https://forum.fhem.de/index.php/topic,124095.0.html</a>');
	  //iI_HM_IOdevices     Initialized: cul868;disconnected: hmuart1;dummy: hmusb1;ok: hmlan1;
		var ios = ioInfoRaw.match(/\s[^;]+/g);
		ios.forEach(function(io,idx,arr) {arr[idx] = io.trim();});
		iolist = ios.join(',');
		ios.forEach(function(io) {
			var color = (ioInfoRaw.match('(?:Initialized|ok):\\s[^;]*'+io+'[^;]*;'))? 'lime': 'red';
			ioInfo = ioInfo.replace(io,'<a href="/fhem?detail='+io+'"><span style="color: '+color+';">'+io+'</span></a>');
		});
	}
	else if(ioInfoRaw != null && ioInfoRaw.match(/>/)) { //new hminfo version
		//iI_HM_IOdevices     ccu>Initialized:cul868;ok:hmlan1,hmuart1; noVccu>dummy:hmusb2; vccu2>dummy:hmusb1;
		var vccuStrArr = ioInfoRaw.split(' ');
		vccuStrArr.forEach(function(vccuStr) {
			var vccu = vccuStr.replace(/>.*$/,'');
			if(vccu != 'noVccu') {
				var vccuIOs = vccuStr.match(/(?<=:|,)[^,;]+/g);
				vcculist += (vcculist == '')? vccu+':'+vccuIOs.join(','): ' '+vccu+':'+vccuIOs.join(',');
			}
		});
		var vccus = ioInfoRaw.match(/(?<=^|\s)[^>]+/g);
		vccus.forEach(function(vccu) {
			if(vccu == 'noVccu') {ioInfo = ioInfo.replace(vccu,'<span style="color: lightblue;">'+vccu+'</span>');}
			else {ioInfo = ioInfo.replace(vccu,'<a href="/fhem?detail='+vccu+'"><span style="color: lightblue;">'+vccu+'</span></a>');}
		});
		var ios = ioInfoRaw.match(/(?<=:|,)[^,;]+/g);
		iolist = ios.join(',');
		ios.forEach(function(io) {
			var color = (ioInfoRaw.match('(?:Initialized|ok):[^;]*'+io+'[^;]*;'))? 'lime': 'red';
			ioInfo = ioInfo.replace(io,'<a href="/fhem?detail='+io+'"><span style="color: '+color+';">'+io+'</span></a>');
		});
	}
	else { //from fhem-restart until first hminfo-update
		ioInfo = 'IO_Devices: Info_Unknown';
	}
	$('#hminfotools').attr('vcculist',vcculist);
	$('#hminfotools').attr('iolist',iolist);
	document.getElementById('hminfo_ios').innerHTML = ioInfo;
}
function HMinfoTools_getInfoFromErrorDevices(idStr) {
	var deviceList;
	var isFirstRun = ($('#'+idStr).attr('errordevices_data') == 'start')? true: false;
	if(isFirstRun) {
		if(HMinfoTools_debug) {log('HMinfoTools: get data, 1. run');}
		deviceList = document.getElementById(idStr).getAttribute('errordevices_list');
	}
	else {
		if(HMinfoTools_debug) {log('HMinfoTools: get data, 2. run');}
		deviceList = document.getElementById(idStr).getAttribute('errordevices_list').split(':')[1];
		if(deviceList != '') {
			devices = deviceList.split(',');
			for(var d = 0; d < devices.length; ++d) {
				HMinfoTools_initMapDevice(devices[d]);
				var newObj = HMinfoTools_devMap.get(devices[d]);
				newObj.parentDev = devices[d];
				HMinfoTools_devMap.set(devices[d],newObj);
			}
		}
		else {
			$('#'+idStr).attr('errordevices_data','ready');
			return;
		}
	}
	
	var iolist = document.getElementById(idStr).getAttribute('iolist');
	var ios = iolist.split(',');
	var cmd = 'list ' +deviceList+ ' i:DEF i:device ';
	cmd += 'a:alias ';
	cmd += 'a:model ';
	cmd += 'r:commState ';
	cmd += 'r:sabotageAttack_ErrIoAttack_cnt ';
	cmd += 'a:actCycle a:actStatus ';
	cmd += 'r:sabotageError ';
	cmd += 'i:IODev ';
	for(var i = 0; i < ios.length; ++i) {cmd += 'i:rssi_at_' +ios[i]+ ' ';}
	cmd += 'a:IOgrp ';
	cmd += 'a:IODev ';
	cmd += 'r:battery ';
	cmd += 'r:batNotOkCtr ';
	cmd += 'r:motorErr ';
	cmd += 'r:smoke_detect ';
	cmd += 'r:cfgState ';
	cmd += 'i:NAME';
	if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
	var url = HMinfoTools_makeCommand(cmd);
	$.get(url,function(data) {
		if(data != null) {
			/*
			HM_196BD8                                  DEF             196BD8
																								 model           HM-SEC-RHS
													 2021-03-17 18:10:43   commState       Info_Cleared
													 2021-02-21 19:54:41   sabotageError   on
																								 IODev           cul868
				  								 2021-01-06 14:42:48   motorErr        adjusting range too small //value with whitespaces!
													 2021-02-21 19:54:41   battery         ok
													 2021-03-18 20:14:41   cfgState        PeerIncom,RegMiss
																								 NAME            HM_196BD8
			*/
			var informDevices = deviceList + ',';
			var devObj = {};
			var lines = data.split('\n');
			for(var l = 0; l < lines.length; ++l) {
				var deviceEnd = false;
				var line = lines[l];
				if(line.match(/\sDEF\s/)) {
					var device = line.match(/^[^\s]+/)[0];
					devObj = HMinfoTools_devMap.get(device);
					devObj.name = device;
					if(line.match(/[^\s]+$/)[0].length == 6) {devObj.parentDev = devObj.name;}
				}
				else if(line.match(/\sdevice\s/)) {devObj.parentDev = line.match(/[^\s]*$/)[0];}
				else if(line.match(/\salias\s/)) {devObj.alias = line.replace(/^\s+alias\s+/,'');}//value with whitespaces
				else if(line.match(/\smodel\s/)) {devObj.model = line.match(/[^\s]*$/)[0];}
				else if(line.match(/\scommState\s/)) {devObj.commState = line.match(/[^\s]*$/)[0];}
				else if(line.match(/\ssabotageAttack_ErrIoAttack_cnt\s/)) {devObj.sabotageAttack = line.match(/[^\s]*$/)[0];}
				else if(line.match(/\sactCycle\s/)) {devObj.actCycle = line.match(/[^\s]*$/)[0];}
				else if(line.match(/\sactStatus\s/)) {devObj.actStatus = line.match(/[^\s]*$/)[0];}
				else if(line.match(/\ssabotageError\s/)) {devObj.sabotageError = line.match(/[^\s]*$/)[0];}
				else if(line.match(/\sIODev\s/)) {
					if(devObj.IODev == '') {devObj.IODev = line.match(/[^\s]*$/)[0];}
					else {devObj.aIODev = line.match(/[^\s]*$/)[0];}
				}
				else if(line.match(/\sIOgrp\s/)) {devObj.IOgrp = line.match(/[^\s]*$/)[0];}
				else if(line.match('\\srssi_at_' +devObj.IODev+ '\\s')) {devObj.rssi = line.match(/cnt:.+$/)[0];}
				else if(line.match(/\sbattery\s/)) {devObj.battery = line.match(/[^\s]*$/)[0];}
				else if(line.match(/\sbatNotOkCtr\s/)) {devObj.batNotOkCtr = line.match(/[^\s]*$/)[0];}
				else if(line.match(/\smotorErr\s/)) {devObj.motorErr = line.replace(/^.+\s+motorErr\s+/,'');}//value with whitespaces
				else if(line.match(/\ssmoke_detect\s/)) {devObj.smokeDetect = line.match(/[^\s]*$/)[0];}
				else if(line.match(/\scfgState\s/)) {devObj.cfgState = line.match(/[^\s]*$/)[0];}
				else if(line.match(/\sNAME\s/)) {deviceEnd = true;}
				
				if(deviceEnd) { //save and check info from device
					if(devObj.parentDev != devObj.name) { //current device is channelDevice
						if(informDevices.match(devObj.parentDev + ',') == null) {
							informDevices += devObj.parentDev +',';
						}
					}
					else { //current device is parentDevice
						if(devObj.commState == '') {devObj.commState = 'Info_Unknown';}
						if(devObj.actCycle == '') {devObj.actCycle = 'unknown';}
						if(devObj.actStatus == '') {devObj.actStatus = 'unknown';}
						if(devObj.actCycle != 'unknown') {
							if(devObj.actCycle == '000:00') {devObj.activity = 'switchedOff';}
							else {devObj.activity = devObj.actStatus;}
						}
						else {devObj.activity = 'unused';}
						if(devObj.IODev == '' || devObj.IODev.match(/^helper=HASH\(/)) {devObj.IODev = 'missing_IODev';}
						devObj.rssi = 'rssi_at_'+devObj.IODev+' => ' + ((devObj.rssi == '')? 'missing_rssi': devObj.rssi);
						if(devObj.aIODev == '') {devObj.aIODev = 'missing_aIODev';}
						if(devObj.IOgrp == '') {devObj.IOgrp = 'missing_IOgrp';}
					}
					if(devObj.model == '') {devObj.model = 'missing_model';}
					if(devObj.cfgState == '') {devObj.cfgState = 'Info_Unknown';}
					HMinfoTools_devMap.set(devObj.name,devObj);
				}
			}
			
			if(isFirstRun) {
				$('#'+idStr).attr('errordevices_data','first');
				informDevices = informDevices.replace(/,$/,'');
				informDevices = (informDevices == deviceList)? '': informDevices.replace(deviceList+',','');
				$('#'+idStr).attr('errordevices_list',deviceList +':'+ informDevices);
			}
			else {$('#'+idStr).attr('errordevices_data','ready');}
		}
	});
}
function HMinfoTools_changeInformChannel(informDevices) {
	if($('#hminfotools').attr('device') != null) {
		informDevices = $('#hminfotools').attr('device')+((informDevices == '')? '': ',' + informDevices);
	}
	var weblinkdiv = document.getElementById('hminfotools_weblink'); 
	if(weblinkdiv != null) { //other devices on a room-site
		//SB_PLAYER_0004201e98ec
		//SB_PLAYER_0004201e98ec-volume
		var roomDevices = '';
		$("[informid]").each(function() {
			var inform = this.getAttribute('informid');
			if(!inform.match(/-/) && !roomDevices.match(inform + ',')) {roomDevices += inform + ',';}
		});
		roomDevices = roomDevices.replace(/,$/,'');
		informDevices += ((roomDevices == '')? '': ',' + roomDevices);
	}
	document.body.setAttribute('longpollfilter',informDevices);
	FW_closeConn(); 
	setTimeout(FW_longpoll,300); // forum # 112181
}

//###### icons,longpoll #######################################################################################
function HMinfoTools_UpdateLine(d) {
	if(document.getElementById('hminfotools') == null && document.getElementById('HMdeviceTools_toolsTable') == null) {return;}
	
	if(d[0].match(/-commState$/)) {
		var evtDevice = d[0].match(/^[^-]+/)[0];
		$("[id^='icon_commState_'][pollid='" +evtDevice+ "']").each(function() {
			var errDevice = this.id.replace(/icon_commState_/,'');
			HMinfoTools_setIconFromCommState(errDevice,d[1]);
		});
		return;
	}
	if(d[0].match(/-Activity$/)) {
		var evtDevice = d[0].match(/^[^-]+/)[0];
		$("[id^='icon_Activity_'][pollid='" +evtDevice+ "']").each(function() {
			var errDevice = this.id.replace(/icon_Activity_/,'');
			HMinfoTools_setIconFromActivity(errDevice,d[1]);
		});
		return;
	}
	if(d[0].match(/-rssi_at_/)) {
		var evtDevice = d[0].match(/^[^-]+/)[0];
		$("[id^='icon_rssi_'][pollid='" +evtDevice+ "']").each(function() {
			var errDevice = this.id.replace(/icon_rssi_/,'');
			var io = HMinfoTools_devMap.get(errDevice).IODev;
			if(d[0].match('-rssi_at_' +io+ '$')) {
				HMinfoTools_setIconFromRssi(errDevice,'rssi_at_' +io+ ' => last: ' +d[1]);
			}
		});
		return;
	}
	if(d[0].match(/-IODev$/)) {
		var evtDevice = d[0].match(/^[^-]+/)[0];
		if(HMinfoTools_devMap.has(evtDevice) && d[1] != HMinfoTools_devMap.get(evtDevice).IODev) { //io change
			HMinfoTools_getChangedIODevData(evtDevice);
		}
		return;
	}
	if(d[0].match(/-cfgState$/)) {
		var evtDevice = d[0].match(/^[^-]+/)[0];
		$("[id^='icon_cfgState_'][pollid='" +evtDevice+ "']").each(function() {
			var errDevice = this.id.replace(/icon_cfgState_/,'');
			HMinfoTools_setIconFromCfgState(errDevice,d[1]);
		});
		return;
	}
	if(d[0].match(/-battery$/)) {
		var evtDevice = d[0].match(/^[^-]+/)[0];
		$("[id^='icon_battery_'][pollid='" +evtDevice+ "']").each(function() {
			var errDevice = this.id.replace(/icon_battery_/,'');
			var devObj = HMinfoTools_devMap.get(errDevice);
			devObj.battery = d[1];
			HMinfoTools_devMap.set(errDevice, devObj);
			HMinfoTools_setIconFromBattery(errDevice,d[1]);
		});
		return;
	}
	if(d[0].match(/-batNotOkCtr$/)) {
		var evtDevice = d[0].match(/^[^-]+/)[0];
		$("[id^='icon_battery_'][pollid='" +evtDevice+ "']").each(function() {
			var errDevice = this.id.replace(/icon_battery_/,'');
			var devObj = HMinfoTools_devMap.get(errDevice);
			devObj.batNotOkCtr = d[1];
			HMinfoTools_devMap.set(errDevice, devObj);
			HMinfoTools_setIconFromBattery(errDevice,devObj.battery);
		});
		return;
	}
	if(d[0].match(/-motorErr$/)) {
		var evtDevice = d[0].match(/^[^-]+/)[0];
		$("[id^='icon_motorErr_'][pollid='" +evtDevice+ "']").each(function() {
			var errDevice = this.id.replace(/icon_motorErr_/,'');
			HMinfoTools_setIconFromMotorErr(errDevice,d[1]);
		});
		return;
	}
	if(d[0].match(/-sabotageError$/)) {
		var evtDevice = d[0].match(/^[^-]+/)[0];
		$("[id^='icon_sabotageError_'][pollid='" +evtDevice+ "']").each(function() {
			var errDevice = this.id.replace(/icon_sabotageError_/,'');
			HMinfoTools_setIconFromSabotageError(errDevice,d[1]);
		});
		return;
	}
	if(d[0].match(/-sabotageAttack_ErrIoAttack_cnt$/)) {
		var evtDevice = d[0].match(/^[^-]+/)[0];
		$("[id^='icon_sabotageAttack_'][pollid='" +evtDevice+ "']").each(function() {
			var errDevice = this.id.replace(/icon_sabotageAttack_/,'');
			HMinfoTools_setIconFromSabotageAttack(errDevice,d[1]);
		});
		return;
	}
	if(d[0].match(/-smoke_detect$/)) {
		var evtDevice = d[0].match(/^[^-]+/)[0];
		$("[id^='icon_smokeDetect_'][pollid='" +evtDevice+ "']").each(function() {
			var errDevice = this.id.replace(/icon_smokeDetect_/,'');
			HMinfoTools_setIconFromSmokeDetect(errDevice,d[1]);
		});
		return;
	}

	if(document.getElementById('hminfotools') != null) {
		var hminfo = document.getElementById('hminfotools').getAttribute('device');
		//"hminfo-lastErrChange","updated:2020-07-13 16:06:02","updated:2020-07-13 16:06:02"
		if(d[0].match(hminfo + '-lastErrChange') && d[1].match(/^updated:/)) {
			HMinfoTools_updateErrorDevicesTable(hminfo,d[1]);
			return;
		}
		//"hminfo","updated:2020-08-05 11:48:28","<div id=\u0022hminfo\u0022  title=\u0022updated:2020-08-05 11:48:28\u0022 class=\u0022col2\...(173)
		if(d[0] == hminfo && document.getElementById('hminfo_ios').innerText == 'IO_Devices: Info_Unknown'
											&& document.getElementById('hminfo_change').innerText == d[1]) {
			HMinfoTools_updateErrorDevicesTable(hminfo,'');
			return;
		}
	}
}

function HMinfoTools_updateErrorDevicesTable(hminfo,lastChange) {
	HMinfoTools_devMap.clear();
	document.getElementById('hminfo_table_errDev').innerHTML = '';
	document.getElementById('hminfo_info').innerHTML = ' => updating...';
	if(lastChange != '') {
		var click = "HMinfoTools_clickSetFunctionG('"+hminfo+"','update')";
		lastChange = lastChange.replace(/updated/,'<span title="on click => set '+hminfo+' update"'+
																		' onclick="'+click+'" style="color: lightblue; cursor: pointer;">updated</span>');
		document.getElementById('hminfo_change').innerHTML = lastChange;
	}
	HMinfoTools_parseErrorDevices(hminfo,document.getElementById('hminfotools_weblink'));
}
function HMinfoTools_createErrorDevicesTable(errorDevices) {
	var tbody = document.getElementById('hminfo_table_errDev');
	var z = 0;
	var devices = errorDevices.split(',');
	for(var d = 0; d < devices.length; ++d) {
		++z;
		var device = devices[d];
		var tr = document.createElement('tr');
		tbody.appendChild(tr);
		tr.id = 'hminfo_devRow_' + device;
		//if(z%2 != 0) {tr.setAttribute('class','even');}
		//else {tr.setAttribute('class','odd');}
		if(z%2 != 0) {tr.style.backgroundColor = '#333333';}
		else {tr.style.backgroundColor = '#111111';}
		var td = document.createElement('td');
		tr.appendChild(td);
		HMinfoTools_createIconCells(td,device); //###############################################
		var td = document.createElement('td');
		tr.appendChild(td);
		var colorN = 'lightblue';
		var colorA = '#CCCCCC';
		var alias = (HMinfoTools_devMap.get(device).alias != '')? ' ('+HMinfoTools_devMap.get(device).alias+')': '';
		td.innerHTML = '<a href="/fhem?detail=' +device+ '"><span style="color: '+colorN+';">' +device+ '</span>'
									+ '<span style="color: '+colorA+';">' +alias+ '</span></a>';
		var td = document.createElement('td');
		tr.appendChild(td);
		var errors = HMinfoTools_devMap.get(device).errors;
		td.innerHTML = errors.join(', ');
	}
	$("[id^='hminfo_devRow_']").each(function() {
		var errDevice = this.id.replace('hminfo_devRow_','');
		HMinfoTools_initIcons(errDevice); //#####################################################
	});
	document.getElementById('hminfo_info').innerHTML = '';
}

function HMinfoTools_loadIcons(device,td) {
	var hminfo = $('#hminfotools').attr('device');
	var isHMinfo = (device == $('#hminfotools').attr('device'))? true: false;
	for(var i = 0; i < HMinfoTools_icons.length; ++i) {
		var iconName = HMinfoTools_icons[i].name;
		var icon = HMinfoTools_icons[i].svg;
		var click = HMinfoTools_icons[i].clickG;
		var iconCell = document.createElement('span');
		td.appendChild(iconCell);
		iconCell.id = 'icon_' +iconName+ '_hminfo';
		//iconCell.style.margin = '0px 0px 0px 0px';
		if(isHMinfo && click != '') {
			iconCell.style.cursor = 'pointer';
			iconCell.title = 'on click => set ' +hminfo+ ' ' +click;
			iconCell.setAttribute('onclick',"HMinfoTools_clickSetFunctionG('"+hminfo+"','"+click+"')");
		}
		var dummy = document.createElement('span');
		td.appendChild(dummy);
		dummy.innerHTML = ' ';
		if(iconCell.innerHTML == '') {
			var cmd = "{FW_makeImage('" +icon+ "@white')}";
			if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
			var url = HMinfoTools_makeCommand(cmd);
			$.ajax({
				url: url,
				type: "GET",
				context: iconCell,
				success: function(data){
					if(data) {
						this.innerHTML = data;
						if(this.id == 'icon_commState_hminfo') {
							$('#' +this.id+ ' svg').css('height','12px');
							$('#' +this.id+ ' svg').css('width','12px');
						}
						else {
							$('#' +this.id+ ' svg').css('height','20px');
							$('#' +this.id+ ' svg').css('width','20px');
						}
						var idStr = (isHMinfo)? 'hminfotools': 'HMdeviceTools_toolsTable';
						var loadedIcons = $('#' +idStr).attr('loaded_icons');
						if(loadedIcons == 'init') {$('#' +idStr).attr('loaded_icons','1');}
						else {$('#' +idStr).attr('loaded_icons',parseInt(loadedIcons)+1);}
					}
				}
			});
		}
	}
}
function HMinfoTools_clickSetFunctionG(hminfo,click) { //set hminfo click function
	var cmd = 'set '+hminfo+' '+click;
	if(HMinfoTools_debug) {log('HMinfoTools: '+cmd);}
	var url = HMinfoTools_makeCommand(cmd);
	$.get(url,function(data) {
		if(data) {FW_okDialog(data);}
		else {if(click == 'clearG rssi') {location.reload();}}
	});
}
function HMinfoTools_createIconCells(td,device) {
	/*
	var dummy = document.createElement('span');
	td.appendChild(dummy);
	dummy.innerHTML = ' ';
	*/
	for(var i = 0; i < HMinfoTools_icons.length; ++i) {
		var iconName = HMinfoTools_icons[i].name;
		var iconPoll = HMinfoTools_icons[i].poll;
		var iconClick = HMinfoTools_icons[i].click;
		var iconCell = document.createElement('span');
		td.appendChild(iconCell);
		iconCell.id = 'icon_' +iconName+ '_' + device;
		//iconCell.style.margin = '0px 0px 0px 0px';
		if(iconClick != '' && iconName != 'cfgState' && iconName != 'battery' && iconName != 'sabotageAttack') { //only if icons exist on any devices
			iconCell.style.cursor = 'pointer';
			iconCell.setAttribute('onclick',iconClick +"('"+ device + "')");
		}
		iconCell.setAttribute('pollid',((iconPoll == 'parent')? HMinfoTools_devMap.get(device).parentDev: device));
		iconCell.innerHTML = document.getElementById('icon_' +iconName+ '_hminfo').innerHTML;
		var idStr = iconCell.id.replace(/\./g,'\\.');
		if(iconName == 'Activity' && HMinfoTools_devMap.get(device).model.match(/^(missing_model|CCU-FHEM|VIRTUAL)$/)) { //virtual device
			$('#' +idStr+ ' path').css('visibility','hidden');
		}
		else if(iconName == 'battery') {
			$('#' +idStr+ ' path').css('visibility','hidden');
		}
		else if(iconName == 'motorErr') {
			$('#' +idStr+ ' path').css('visibility','hidden');
		}
		else if(iconName == 'smokeDetect') {
			$('#' +idStr+ ' path').css('visibility','hidden');
		}
		else if(iconName == 'sabotageAttack') {
			$('#' +idStr+ ' path').css('visibility','hidden');
			$('#' +idStr+ ' rect').css('visibility','hidden');
			$('#' +idStr+ ' polygon').css('visibility','hidden');
		}
		else if(iconName == 'sabotageError') {
			$('#' +idStr+ ' g').css('visibility','hidden');
		}
		var dummy = document.createElement('span');
		td.appendChild(dummy);
		dummy.innerHTML = ' ';
	}
}
function HMinfoTools_initIcons(device) {
	var devObj = HMinfoTools_devMap.get(device);
	if(device != devObj.parentDev) { //device is channelDevice
		var parObj = HMinfoTools_devMap.get(devObj.parentDev);
		devObj.commState = parObj.commState;
		devObj.activity = parObj.activity;
		devObj.rssi = parObj.rssi;
		devObj.IODev = parObj.IODev;
		devObj.aIODev = parObj.aIODev;
		devObj.IOgrp = parObj.IOgrp;
		devObj.battery = parObj.battery;
		devObj.batNotOkCtr = parObj.batNotOkCtr;
		devObj.sabotageError = parObj.sabotageError;
		devObj.sabotageAttack = parObj.sabotageAttack;
		HMinfoTools_devMap.set(devObj.name,devObj);
	}
	//all entities use these icons
	HMinfoTools_setIconFromCommState(device,devObj.commState);
	HMinfoTools_setIconFromRssi(device,devObj.rssi);
	HMinfoTools_setIconFromIODev(device,devObj.IODev);
	HMinfoTools_setIconFromCfgState(device,devObj.cfgState);
	// only some entities use these icons
	if(!devObj.model.match(/^(missing_model|CCU-FHEM|VIRTUAL)$/)) {HMinfoTools_setIconFromActivity(device,devObj.activity);}
	if(devObj.battery != '') {HMinfoTools_setIconFromBattery(device,devObj.battery);}
	if(devObj.motorErr != '') {HMinfoTools_setIconFromMotorErr(device,devObj.motorErr);}
	if(devObj.sabotageError != '') {HMinfoTools_setIconFromSabotageError(device,devObj.sabotageError);}
	if(devObj.sabotageAttack != '') {HMinfoTools_setIconFromSabotageAttack(device,devObj.sabotageAttack);}
	if(devObj.smokeDetect != '') {HMinfoTools_setIconFromSmokeDetect(device,devObj.smokeDetect);}
}

//###### icon functions for devices ###############################################
function HMinfoTools_setIconFromCommState(device,commState) {
	/*
	color       commState
	---------------------------------------------------------
	white       Info_Cleared, Info_Unknown (missing reading)
	yellow      CMDs_processing..., CMDs_FWupdate
	orange      CMDs_pending
	red         CMDs_done_Errors:1
	green       CMDs_done, CMDs_done_FWupdate
	*/
	var color = 'white';
	if(commState.match(/^(Info_Cleared|Info_Unknown)$/)) {color = 'white';}
	else if(commState.match(/^(CMDs_done|CMDs_done_FWupdate)$/)) {color = 'lime';}
	else if(commState.match(/^(CMDs_processing...|CMDs_FWupdate)$/)) {color = 'yellow';}
	else if(commState.match(/^CMDs_pending$/)) {color = 'orange';}
	else if(commState.match(/^CMDs_done_Errors:/)) {color = 'red';}
	
	var iconCommState = document.getElementById('icon_commState_' + device);
	iconCommState.title = 'commState: ' +commState+ '\non click => set ' +HMinfoTools_devMap.get(device).parentDev+ ' clear msgEvents';

	var led = iconCommState.querySelector('path');
	var blinkLed = led.animate([{fill: color},{fill: 'black'}], {
										duration: 1000, 
										iterations: Infinity, 
										easing: 'ease-in' 
									});
	if(color == 'orange') {
		blinkLed.play();
	}
	else {
		blinkLed.pause();
		led.setAttribute('fill','black');
		setTimeout(led.setAttribute('fill',color),300);
	}
}
function HMinfoTools_setClearMsgEvents(device) { //click commstate
	var parentDev = HMinfoTools_devMap.get(device).parentDev;
	var cmd = 'set '+parentDev+' clear msgEvents';
	if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
	var url = HMinfoTools_makeCommand(cmd);
	$.get(url,function(data) {
		if(data) {FW_okDialog(data);}
	});
}

function HMinfoTools_setIconFromRssi(device,rssiList) {
	/*
	hminfo: I_rssiMinLevel	59<:11 60>:10 80>:4 99>:1
	color    rssi                  special
	-----------------------------------------------------
	white    missing_rssi
	green    -80 <  rssi
	yellow   -90 <  rssi <= -80
	orange   -99 <= rssi <= -90
	red             rssi <  -99    ,missing_IODev
	*/
	var color = 'white';
	if(rssiList.match(/^missing_IODev$/)) {color = 'red';}
	else {
		var rssi;
		if(!rssiList.match(/last:/)) {
			//rssi_at_cul868 => cnt:484 min:-39.5 max:-38 avg:-39.09 lst:-39.5
			var mRssi = rssiList.match(/min:([^\s]*)/);
			rssi = (mRssi != null && mRssi[1] != undefined)? mRssi[1]: '';
		}
		else {
			//rssi_at_cul868 => last: -39.5
			var mRssi = rssiList.match(/last:\s(.*)$/);
			rssi = (mRssi != null && mRssi[1] != undefined)? mRssi[1]: '';
		}
		if(rssi != '') {
			if(-80 < rssi) {color = 'lime';}
			else if(-90 < rssi && rssi <= -80) {color = 'yellow';}
			else if(-99 <= rssi && rssi <= -90) {color = 'orange';}
			else if(rssi < -99) {color = 'red';}
		}
		else {color = 'white';}
	}
	
	var iconRssi = document.getElementById('icon_rssi_' + device);
	iconRssi.title = rssiList + '\non click => set ' +HMinfoTools_devMap.get(device).parentDev+ ' clear rssi';

	var devStr = device.replace(/\./g,'\\.');
	var bColor = $('#icon_rssi_' + devStr).css('background-color');
	$('#icon_rssi_'+devStr+' g').css('fill',bColor);
	setTimeout(function(){
		$('#icon_rssi_'+devStr+' g').css('fill',color);
		if(rssiList.match(/last:/)) {$('#icon_rssi_'+devStr+" path[d^='M1319']").css('fill','white');}
	},300);
}
function HMinfoTools_setClearRssi(device) { //click rssi
	var parentDev = HMinfoTools_devMap.get(device).parentDev;
	var cmd = 'set '+parentDev+' clear rssi';
	if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
	var url = HMinfoTools_makeCommand(cmd);
	$.get(url,function(data) {
		if(data) {FW_okDialog(data);}
		else {
			var cmd = 'jsonlist2 ' + parentDev;
			if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
			var url = HMinfoTools_makeCommand(cmd);
			$.get(url,function(data) {
				if(data) {
					var object = data.Results[0];
					var internalsString = JSON.stringify(object.Internals);
					var curIoDev = (object.Internals.IODev != null)? 
													object.Internals.IODev: 'missing_IODev';
					var curIoRssi = 'rssi_at_'+curIoDev+' => ' + ((internalsString.match('rssi_at_'+curIoDev))? 
																										 object.Internals['rssi_at_'+curIoDev]: 
																										 'missing_rssi');
					HMinfoTools_setIconFromRssi(device,curIoRssi);
				}
			});
		}
	});
}

function HMinfoTools_getChangedIODevData(device) {
	var cmd = 'jsonlist2 ' + device;
	if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
	var url = HMinfoTools_makeCommand(cmd);
	$.get(url,function(data) {
		var object = data.Results[0];
		if(object) {
			var devObj = HMinfoTools_devMap.get(device);
			devObj.IODev = (object.Internals.IODev != null)
												? object.Internals.IODev
												: 'missing_IODev';
			devObj.aIODev = (object.Attributes.IODev != null)
												? object.Attributes.IODev
												: 'missing_aIODev';
			devObj.IOgrp = (object.Attributes.IOgrp != null)
												? object.Attributes.IOgrp
												: 'missing_IOgrp';
			var internalsString = JSON.stringify(object.Internals);
			devObj.rssi = 'rssi_at_'+devObj.IODev+' => ' + ((internalsString.match('rssi_at_'+devObj.IODev))
																												? object.Internals['rssi_at_'+devObj.IODev]
																												: 'missing_rssi');
			HMinfoTools_devMap.set(device,devObj);

			$("[id^='icon_IODev_'][pollid='" +device+ "']").each(function() {
				var errDevice = this.id.replace(/icon_IODev_/,'');
				if(errDevice != device) {
					var errDevObj = HMinfoTools_devMap.get(errDevice);
					errDevObj.IODev = devObj.IODev;
					errDevObj.aIODev = devObj.aIODev;
					errDevObj.IOgrp = devObj.IOgrp;
					errDevObj.rssi = devObj.rssi;
					HMinfoTools_devMap.set(errDevice,errDevObj);
				}
				HMinfoTools_setIconFromIODev(errDevice,devObj.IODev);
				HMinfoTools_setIconFromRssi(errDevice,devObj.rssi);
			});
		}
	});
}
function HMinfoTools_setIconFromIODev(device,iodev) {
	// color      attr IOgrp set                              attr IODev set                           none
	// --------------------------------------------------------------------------------------------------------
	// white      no prefered set                                                         
	// green      1. prefered                                 reading = attr
	// yellow     2. prefered
	// orange     no prefered
	// red        no poolmember, missing_IODev                reading != attr, missing_IODev           only red
	var devObj = HMinfoTools_devMap.get(device);
	var IOgrp = (devObj.IOgrp != 'missing_IOgrp')? devObj.IOgrp: '';
	var curVccu = IOgrp.replace(/:.+$/,'');
	var curVccuIoArr = []; 

	//HMinfoTools.js line 1456:
	//TypeError: $(...).attr(...).match(...) is null
	if(document.getElementById('hminfotools') != null) { //only with hminfo
		curVccuIoArr = (curVccu != '')? $('#hminfotools').attr('vcculist').match('(?<=^'+curVccu+':|\\s'+curVccu+':)[^\\s]+')[0].split(','): [];
	}
	else {
		curVccuIoArr = [iodev]; //fake for HMdeviceTools!!!
	}
	
	var aIODev = devObj.aIODev;
	var color = 'blue'; // missing category
	var text = ' (bug: missing category!)';
	
	if(iodev == 'missing_IODev') {
		color = 'red';
		text = '';
	}                    // no io in use
	else if(IOgrp && IOgrp != 'missing_IOgrp') {                     // we use vccu
		text = ' (desired => ' +IOgrp+ ')';
		if(IOgrp.match(/:.+$/)) {                                      // we use prefered 
			if(IOgrp.match(':'+iodev+'(?:,|$)')) {color = 'lime';}
			else if(IOgrp.match(','+iodev+'(?:,|$)')) {color = 'yellow';}
			else if(curVccuIoArr.includes(iodev)) {color = 'orange';}
			else {color = 'red';}
		}
		else {                                                         // we use no prefered
			if(curVccuIoArr.includes(iodev)) {color = 'white';}
			else {color = 'red';}
		}
	}
	else if(IOgrp == 'missing_IOgrp' && aIODev == 'missing_aIODev') { // no attributes
		color = 'red';
		text = ' (nothing is desired!!!)';
	}
	else {                                                            // only attr IODev
		text = ' (desired => ' +aIODev+ ')';
		if(iodev == aIODev) {color = 'lime';}
		else {color = 'red';}
	}
	
	var iconIODev = document.getElementById('icon_IODev_' + device);
	iconIODev.title = 'IODev: ' +iodev+ text;

	var devStr = device.replace(/\./g,'\\.');
	var bColor = $('#icon_IODev_' + devStr).css('background-color');
	$('#icon_IODev_' +devStr+ ' path').css('fill',bColor);
	//$('#icon_IODev_' +devStr+ ' path').animate({fill: color},1500);
	setTimeout(function(){
		$('#icon_IODev_' +devStr+ ' path').css('fill',color);
	},50);

//#############################################################
/*	
	var led = iconIODev.querySelector('g');
	var blinkLed = led.animate([{fill: 'black'},{fill: color}], {
										duration: 500, 
										iterations: 5, 
										easing: 'ease-out' 
									});
	blinkLed.play();
	*/
	/*
	if(color == 'orange') {
		blinkLed.play();
	}
	else {
		blinkLed.pause();
		led.setAttribute('fill','black');
		setTimeout(led.setAttribute('fill',color),300);
	}
	*/

}

function HMinfoTools_setIconFromCfgState(device,cfgState) {
	/*
	color       cfgState
	--------------------------------------------------------
	green       "ok"
	white       "Info_Unknown" (no reading)
	orange      "updating"
	red         error list
	*/
	var color = 'white';
	if(cfgState == 'ok') {color = 'lime';}
	else if(cfgState == 'Info_Unknown') {color = 'white';}
	else if(cfgState == 'updating') {color = 'orange';}
	else {color = 'red';}

	var iconCfgState = document.getElementById('icon_cfgState_' + device);
	var clickFunction;
	if(HMinfoTools_devMap.get(device).model.match(/^(missing_model|CCU-FHEM|VIRTUAL)$/)) {clickFunction = '';}
	else {
		clickFunction = '\non click => set ' +device+ ' getConfig';
		iconCfgState.style.cursor = 'pointer';
		iconCfgState.setAttribute('onclick',"HMinfoTools_setGetConfig('"+device+"')");
	}

	if(color == 'red') {
	/*
	 Device name:SwitchPBU06
		 mId      	:0069  Model=HM-LC-SW1PBU-FM
		 mode   	:normal - activity:alive
		 protState	: CMDs_done_Errors:1 pending: none

	 configuration check: updating
		 RegMiss: missing register list
				=>RegL_00.,RegL_01.,RegL_03.Tuer.SZ_chn-01,RegL_03.self01,RegL_03.self02
		 TmplChk: template mismatch
				=>self01:short->autoOff - OnTime :set_20 should 20 
	*/
		var cmd = 'get ' +device+ ' deviceInfo short';
		if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
		var url = HMinfoTools_makeCommand(cmd);
		$.get(url, function(data){
			if(data) {
				iconCfgState.title = data + clickFunction;
				if(cfgState.match(/TmplChk/) && document.getElementById('HMdeviceTools_toolsTable') != null) {
					var lines = data.split('\n');
					for(var l = 0; l < lines.length; ++l) {
						var line = lines[l];
						if(line.match(/=>.+?:.+?->.+?(?:reg\snot\sfound|should)/)) {
							//=>self01:short->autoOff - OnTime :set_20 should 20 
							var mIdx = line.trim().match(/=>([^:]+)/);
							var peer = (mIdx[1] == 0)? 'dev': mIdx[1];
							var link = document.getElementById('HMdeviceTools_reg_link_' + peer);
							if(link.style.color != 'red') {link.style.color = 'red';};
						}
					}
					$("[id^='HMdeviceTools_reg_link_']").each(function() {
						if(this.style.color.match(/^(yellow)$/)) {this.style.color = 'lime';}
					});
				}
			}
		});
	}
	else {iconCfgState.title = 'cfgState: ' +cfgState+ clickFunction;}
	var iconFill = iconCfgState.querySelector('g');
	iconFill.setAttribute('fill',color);
	
	if(!cfgState.match(/TmplChk/) && document.getElementById('HMdeviceTools_toolsTable') != null) {
		$("[id^='HMdeviceTools_reg_link_']").each(function() {
			if(cfgState == 'Info_Unknown' || cfgState == 'updating') {
				if(this.style.color.match(/^(lime|red)$/)) {this.style.color = 'yellow';}
			}
			else {
				if(this.style.color.match(/^(yellow|red)$/)) {this.style.color = 'lime';}
			}
		});
	}
	
}
function HMinfoTools_setGetConfig(device) { //click cfgState
	var cmd = 'set '+device+' getConfig';
	if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
	var url = HMinfoTools_makeCommand(cmd);
	$.get(url,function(data) {
		if(data) {FW_okDialog(data);}
	});
}

function HMinfoTools_setIconFromActivity(device,activity) {
	// color			activity
	// ------------------------------------------
	// white			unused (no attr actCycle)
	// yellow			switchedOff (actCycle = 000:00)
	// orange			unknown
	// red				dead
	// green	    alive
	var color = 'white';
	if(activity == 'unused') {color = 'white';}
	else if(activity == 'switchedOff') {color = 'yellow';}
	else if(activity == 'unknown') {color = 'orange';}
	else if(activity == 'dead') {color = 'red';}
	else if(activity == 'alive') {color = 'lime';}
	
	var devStr = device.replace(/\./g,'\\.');
	$('#icon_Activity_' +devStr).attr('title','Activity: '+activity);
	$('#icon_Activity_' +devStr+ ' path').css('fill',color);
}

function HMinfoTools_setIconFromBattery(device,battery) {
	// color     battery     batNotOkCtr
	// -------------------------------------
	// green     ok          =0, =''
	// yellow    ok          >0
	// orange    low         
	// red       critical
	var devStr = device.replace(/\./g,'\\.');
	var color = 'white';
	var batNotOkCtr = HMinfoTools_devMap.get(device).batNotOkCtr;
	var batNotOkCtrStr = (batNotOkCtr == '')? '': '\nbatNotOkCtr: '+batNotOkCtr;
	if(battery == 'ok') {
		color = (batNotOkCtr == '' || batNotOkCtr == 0)? 'lime': 'yellow';
		$('#icon_battery_'+devStr+" path[id='path23']").show();
		$('#icon_battery_'+devStr+" path[id='path27']").show();
	}
	else if(battery == 'low') {
		color = 'orange';
		$('#icon_battery_'+devStr+" path[id='path23']").hide();
		$('#icon_battery_'+devStr+" path[id='path27']").show();
	}
	else if(battery == 'critical') {
		color = 'red';
		$('#icon_battery_'+devStr+" path[id='path23']").hide();
		$('#icon_battery_'+devStr+" path[id='path27']").hide();
	}
	
	$('#icon_battery_'+devStr).css('cursor','pointer');
	$('#icon_battery_'+devStr).attr('onclick',"HMinfoTools_setBatteryChange('"+devStr+"')");
	$('#icon_battery_'+devStr).attr('title','battery: '+battery+
	                                         batNotOkCtrStr+
	                                        '\non click => edit: attr '+HMinfoTools_devMap.get(device).parentDev+' comment');

//	var bColor = $('#icon_battery_'+devStr).css('background-color');
//	$('#icon_battery_'+devStr+' path').css('fill',bColor);
//	setTimeout(function(){
		$('#icon_battery_'+devStr+' path').css('fill',color);
//	},300);
	$('#icon_battery_'+devStr+' path').css('visibility','visible');
}
function HMinfoTools_setBatteryChange(device) { //click battery
	$('#icon_battery_'+device.replace(/\./g,'\\.')+' path').css('fill','white');
	var devObj = HMinfoTools_devMap.get(device);
	var cmd = 'jsonlist2 '+devObj.parentDev;
	if(HMinfoTools_debug) {log('HMinfoTools: '+cmd);}
	var url = HMinfoTools_makeCommand(cmd);
	$.get(url,function(data) {
		var object = data.Results[0];
		if(object != null) {
			var oldComment = object.Attributes.comment;
			var oldTxt = (oldComment == null)? '': object.Attributes.comment + '\n';
			var d = new Date();
			var ts = d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)+' '+
							('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+':'+('0'+d.getSeconds()).slice(-2);
			devObj.battery = object.Readings.battery.Value;
			HMinfoTools_devMap.set(device,devObj);
			var batNotOkFirstTime = (object.Readings.batNotOkFirstTime != null && 
				object.Readings.batNotOkFirstTime.Value.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}\s[0-9]{2}:[0-9]{2}:[0-9]{2}$/))? 
				object.Readings.batNotOkFirstTime.Value: object.Readings.battery.Time;
			var oldStat = '(oldBat: '+devObj.battery+' since '+batNotOkFirstTime+')';
			var newTxt = 'batChange: '+ts+' '+oldStat;
			var div = $("<div id='FW_okDialog'>");
			$(div).html('Do you realy want a new battery-change-entry for "attr '+device+' comment"?'+
									"<br><br><textarea id='hminfotools_batchange'>"+oldTxt+newTxt+'</textarea>');
			$("body").append(div);
			var area = document.getElementById('hminfotools_batchange');
			area.rows = 5;
			//area.style.minWidth = "calc(100% - 30px)";
			area.focus();
			area.selectionStart = area.value.length - newTxt.length;
			if(area.selectionStart > 0) {--area.selectionStart;}
			area.selectionEnd = area.value.length;

			function doClose() {
				$(div).dialog("close"); $(div).remove();
				HMinfoTools_setIconFromBattery(device,devObj.battery);
			}
			function doEntry() {
				var comment = $('#hminfotools_batchange').val();
				var cmd;
				if(oldComment == null && comment == '') {return;}
				else if(oldComment != null && comment == '') {cmd = 'deleteattr '+devObj.parentDev+' comment';}
				else {
					cmd = 'attr '+devObj.parentDev+' comment '+comment;
					if(object.Readings.batNotOkCtr != null) {cmd += ';setreading '+devObj.parentDev+' batNotOkCtr 0';}
				}
				if(HMinfoTools_debug) {log('HMinfoTools: '+cmd);}
				var url = HMinfoTools_makeCommand(cmd);
				$.get(url,function(data) {if(data) {FW_okDialog(data);}});
			}
			$(div).dialog({
				dialogClass:"no-close", modal:true, width:"auto", closeOnEscape:true, 
				maxWidth:$(window).width()*0.9, maxHeight:$(window).height()*0.9,
				buttons: [{text:"Ok", click:function(){ doEntry(); doClose();}},
									{text:"Cancel",  click:function(){ doClose();}}]
			});
		}
		else {
			HMinfoTools_setIconFromBattery(device,devObj.battery);
		}
	});
}

function HMinfoTools_setIconFromMotorErr(device,motorErr) {
	// color     motorErr
	// --------------------------
	// green     ok
	// red       error
	var color = 'white';
	if(motorErr == 'ok') {color = 'lime';}
	else {color = 'red';}
	
	$('#icon_motorErr_' +device.replace(/\./g,'\\.')).attr('title','motorErr: '+motorErr);
	$('#icon_motorErr_' +device.replace(/\./g,'\\.')+ ' path').css('fill',color);
	$('#icon_motorErr_' +device.replace(/\./g,'\\.')+ ' path').css('visibility','visible');
}

function HMinfoTools_setIconFromSabotageError(device,sabotageError) {
	// color			sabotageError
	// -------------------
	// green		  off
	// red				on
	var color = 'white';
	if(sabotageError == 'off') {color = 'lime';}
	else if(sabotageError == 'on') {color = 'red';}
	
	$('#icon_sabotageError_'+device.replace(/\./g,'\\.')).attr('title','sabotageError: ' + sabotageError);
	$('#icon_sabotageError_'+device.replace(/\./g,'\\.')+' g').css('fill',color);
	$('#icon_sabotageError_'+device.replace(/\./g,'\\.')+' g').css('visibility','visible');
}

function HMinfoTools_setIconFromSabotageAttack(device,attack) {
	// color			attack
	// -------------------
	// red				attack
	var color = 'red';
	
	var devStr = device.replace(/\./g,'\\.');
	$('#icon_sabotageAttack_'+devStr).attr('title','sabotageAttack_ErrIoAttack_cnt: ' + attack
																					+ '\non click => set ' +HMinfoTools_devMap.get(device).parentDev+ ' clear attack');
	$('#icon_sabotageAttack_'+devStr).css('cursor','pointer');
	$('#icon_sabotageAttack_'+devStr).attr('onclick',"HMinfoTools_setClearAttack('"+devStr+"')");
	$('#icon_sabotageAttack_'+devStr+' path').css('fill',color);
	$('#icon_sabotageAttack_'+devStr+' rect').css('fill',color);
	$('#icon_sabotageAttack_'+devStr+' polygon').css('fill',color);
	$('#icon_sabotageAttack_'+devStr+' path').css('visibility','visible');
	$('#icon_sabotageAttack_'+devStr+' rect').css('visibility','visible');
	$('#icon_sabotageAttack_'+devStr+' polygon').css('visibility','visible');

	var iconAttack = document.getElementById('icon_sabotageAttack_' + device);
	var led1 = iconAttack.querySelector('path');
	var led2 = iconAttack.querySelector('rect');
	var led3 = iconAttack.querySelector('polygon');
	led1.animate([{fill: color},{fill: 'black'}], {
		duration: 1000, 
		iterations: 5, 
		easing: 'ease-in' 
	});
	led2.animate([{fill: color},{fill: 'black'}], {
		duration: 1000, 
		iterations: 5, 
		easing: 'ease-in' 
	});
	led3.animate([{fill: color},{fill: 'black'}], {
		duration: 1000, 
		iterations: 5, 
		easing: 'ease-in' 
	});
}
function HMinfoTools_setClearAttack(device) { //click sabotageAttack
	var parentDev = HMinfoTools_devMap.get(device).parentDev;
	var cmd = 'set '+parentDev+' clear attack';
	if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
	var url = HMinfoTools_makeCommand(cmd);
	$.get(url,function(data) {
		if(data) {FW_okDialog(data);}
		else {
			var cmd = 'jsonlist2 ' + parentDev;
			if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
			var url = HMinfoTools_makeCommand(cmd);
			$.get(url,function(data) {
				var object = data.Results[0];
				if(object) {
					if(object.Readings.sabotageAttack_ErrIoAttack_cnt != null) {
						HMinfoTools_setIconFromSabotageAttack(object.Readings.sabotageAttack_ErrIoAttack_cnt.Value);
					}
					else {
						$('#icon_sabotageAttack_'+device.replace(/\./g,'\\.')).removeAttr('title');
						$('#icon_sabotageAttack_'+device.replace(/\./g,'\\.')).css('cursor','');
						$('#icon_sabotageAttack_'+device.replace(/\./g,'\\.')).removeAttr('onclick');
						$('#icon_sabotageAttack_'+device.replace(/\./g,'\\.')+' path').css('visibility','hidden');
						$('#icon_sabotageAttack_'+device.replace(/\./g,'\\.')+' rect').css('visibility','hidden');
						$('#icon_sabotageAttack_'+device.replace(/\./g,'\\.')+' polygon').css('visibility','hidden');
					}
				}
			});
		}
	});
}

function HMinfoTools_setIconFromSmokeDetect(device,smokeDetect) {
	// color     smoke_detect
	// --------------------------
	// green     none
	// red       error
	var color = 'white';
	if(smokeDetect == 'none') {color = 'lime';}
	else {color = 'red';}
	
	$('#icon_smokeDetect_' +device.replace(/\./g,'\\.')).attr('title','smoke_detect: '+smokeDetect);
	$('#icon_smokeDetect_' +device.replace(/\./g,'\\.')+ ' path').css('fill',color);
	$('#icon_smokeDetect_' +device.replace(/\./g,'\\.')+ ' path').css('visibility','visible');
}
//##### end => icon functions #####################################################

function HMinfoTools_createScreenshot() {
	/* https://github.com/niklasvh/html2canvas/issues/2457
	html2canvas(target).then(() => {
		html2canvas(target).then(res => {
			//your code here 
		})
	})
	var range = document.createRange();
	range.selectNode(textNode);
	var rect = range.getBoundingClientRect();
	*/
	
	//var tab = document.body;
	//var tab = document.getElementById("hminfotools");
	var tab = document.getElementById("devicetable");
	var tabRect = tab.getBoundingClientRect(); //
	//Object.freeze(tab);
	var user = navigator.userAgent;
	
	//html2canvas(tab).then(() => { //new experiment => not better
		html2canvas(tab, {
			logging: false, 
			width: tabRect.width,
			height: tabRect.height,
			//x: 192, //version 1.0.0_rc7
			//y: 93 //version 1.0.0_rc7
			x: 0,
			y: 0		}).then(canvas => {
			var dataURL = canvas.toDataURL('image/png');
			//var cmd = "{HMinfoTools_saveScreenshot("+encodeURIComponent(user)+")}";
			var cmd = "{HMinfoTools_saveScreenshot('test')}";
			if(HMinfoTools_debug) {log('HMinfoTools: ' + cmd);}
			var url = HMinfoTools_makeCommand(cmd);
			$.ajax({url: url,type: "POST",
				data: {fileContent: dataURL},
				contentType: 'image/png',
				success: function(data){if(data) {}}
			});
		//}); //new experiment => not better
	});
}

function HMinfoTools_getBaseUrl() {
  var url = window.location.href.split('?')[0];
  url += '?';
  if(HMinfoTools_csrf != null) {url += 'fwcsrf=' +HMinfoTools_csrf+ '&';}
  return url;
}

function HMinfoTools_makeCommand(cmd) {
  return HMinfoTools_getBaseUrl() + 'cmd=' +encodeURIComponent(cmd)+ '&XHR=1';
}

FW_widgets['homematicInfoTools'] = {
  //createFn:HMinfoTools_Create,
  updateLine:HMinfoTools_UpdateLine
};

