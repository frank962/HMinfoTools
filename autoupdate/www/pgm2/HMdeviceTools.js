FW_version["HMdeviceTools.js"] = "$Id: HMdeviceTools.js 1009 2023-11-15 10:18:33Z frank $";

var HMdeviceTools_debug = true;
var csrf;
var tplt = {
	name: '',
	type: '', // '','short','long'
	info: '',
    ass: [], //assignments of template. (entity,[0|peer:[both|long|short]])
	dev: new Map(), //dev: link (entity:peer), save, use, pars[], tplts[]
	reg: new Map(), //reg: name, value, parId, master
	par: new Map()  //par: id, name, value, masterReg, clients[]
};

$(document).ready(function() {
	// get csrf token
	var body = document.querySelector('body');
	if(body != null) {csrf = body.getAttribute('fwcsrf');}
	// get the device name
	var seldiv = document.querySelector('div.makeSelect'); 
	if(seldiv != null) {
		//var isChannelDevice = false;
		var device = seldiv.getAttribute('dev');
		// use jsonlist2 to get all device data
		var cmd = 'jsonlist2 ' + device;
		if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
		var url = HMdeviceTools_makeCommand(cmd);
		$.getJSON(url,function(data) {
			var object = data.Results[0];
			// we add the actions for CUL_HM only
			if(object != null && object.Internals.TYPE == 'CUL_HM' && object.Attributes.model != 'ACTIONDETECTOR') {
				var isParentDev = (object.Internals.DEF.length == 8)? false: true; 
				HMdeviceTools_createRegisterTable(object,isParentDev);
			}
		});
	}
});


// create an extra table with buttons for device and peer registersets
function HMdeviceTools_createRegisterTable(object,isParentDev) {
  // we will insert the table before the internals
  var intdiv = document.querySelector('div.makeTable.wide.internals');
  var div = document.createElement('div');
  intdiv.parentElement.insertBefore(div,intdiv);
	div.id = 'HMdeviceTools_toolsTable';
	div.setAttribute('installation','init');      // init, ready
	div.setAttribute('loaded_icons','init');      // 0_icons: "init"; 9_icons: "9"
	div.setAttribute('errordevices_data','init'); // init, start, first, ready
  div.setAttribute('device',object.Internals.NAME);
  div.setAttribute('parentDev',((isParentDev)? object.Internals.NAME: object.Internals.device));
	div.setAttribute('iolist',((isParentDev)? object.Internals.IODev: ''));
	div.setAttribute('model',object.Attributes.model);
  div.setAttribute('class','makeTable wide internals');
	HMdeviceTools_checkHMinfo(); //check if hminfo is running and set attribute "hminfo"

  //title
	var header = intdiv.firstElementChild.cloneNode(false);
  div.appendChild(header);
  header.innerHTML = 'HMdeviceTools';

	//table
  var table = document.createElement('table');
  div.appendChild(table);
  table.setAttribute('class','block wide internals');
	table.style.backgroundColor = '#333333';
	table.style.color = '#CCCCCCCC';
  var tbody = document.createElement('tbody');
  table.appendChild(tbody);
	tbody.style.backgroundColor = '#111111';
  var tr = document.createElement('tr');
  tbody.appendChild(tr);

	//dummy icons
  var td = document.createElement('td');
  tr.appendChild(td);
	td.id = 'HMdeviceTools_toolsTable_svg';
	td.hidden = true;

	//icons
  var td = document.createElement('td');
  tr.appendChild(td);
	td.id = 'HMdeviceTools_toolsTable_icons';
	td.style.whiteSpace = 'nowrap';
	td.style.width = '210px'; //
	
    //link to device registerset
    var td = document.createElement('td');
    tr.appendChild(td);
    var list = document.createElement('span');
    td.appendChild(list);
    list.id = 'HMdeviceTools_reg_link_dev';
    list.hidden = (object.Attributes.model == 'VIRTUAL' || object.Attributes.model == 'CCU-FHEM')? true: false;
    list.innerHTML = 'Device';
    list.setAttribute('def',object.Internals.DEF);
    list.setAttribute('device',object.Internals.NAME);
    list.setAttribute('model',object.Attributes.model);
    list.setAttribute('onclick',"HMdeviceTools_changeRegister('" + object.Internals.NAME + "','')");
    list.style.margin = '0px 10px 0px 0px';
    list.style.cursor = 'pointer';
    //tplDel:0>button_config,DimUP01:both>single-chn-sensor-peer_par
    var mDel = object.PossibleSets.match('(tplDel:)([^\\s]+)');
    var assTplts = (mDel)? mDel[2].split(',').sort(): [];
    var genTplts = [];
    assTplts.forEach((item) => {
        if(item.match(/^0>/)) {
            genTplts.push(item.replace(/^0>/,''));
        }
    });
    list.style.color = (genTplts.length > 0)? 'yellow': '#CCCCCC';
    list.title = (genTplts.length > 0)? 'assigned templates:\n => ' + genTplts.sort().join("\n => "): '';

    //if device has peers - create a button for every peer
    if(object.Internals.peerList != null && !(object.Attributes.model == 'VIRTUAL' || object.Attributes.model == 'CCU-FHEM')) {
        var peers = object.Internals.peerList.split(',');
        var readings = JSON.stringify(object);
        for(var i = 0; i < peers.length; ++i) {
            var p = peers[i];
            var peerIsExtern = (p != '' && p.match(/^self\d\d$/) == null);
            if(p.length > 0) {
                var mSpecial = readings.match(p + '_chn-01');
                var suffix = (mSpecial != null)? '_chn-01': '';
                list = document.createElement('span');
                td.appendChild(list);
                list.id = 'HMdeviceTools_reg_link_' + p;
                list.innerHTML = p;
                if(peerIsExtern) {list.setAttribute('peersuffix',suffix);}
                list.setAttribute('onclick',"HMdeviceTools_changeRegister('" + object.Internals.NAME + "','" +p+ "')");
                list.style.margin = '0px 10px 0px 0px';
                list.style.cursor = 'pointer';
                var peerTplts = [];
                assTplts.forEach((item) => {
                    var s1 = item.split('>');
                    var s2 = s1[0].split(':');
                    if(s2[0].match('^' +p+ '$')) {
                        peerTplts.push(s1[1] + ((s2[1] != null && s2[1] != 'both')? '_'+s2[1]: ''));
                    }
                });
                list.style.color = (peerTplts.length > 0)? 'yellow': '#CCCCCC';
                list.title = (peerTplts.length > 0)? 'assigned templates:\n => ' + peerTplts.sort().join("\n => "): '';
            }
        }
    }
    div.setAttribute('installation','ready');
}


// parse the register list - store info into a map
function HMdeviceTools_parseRegisterList(data) {
  var regmap = new Map();
  var lines = data.split('\n');
  for(var i = 1; i < lines.length; ++i) {
    var line = lines[i];
    var match = line.match(/\s*\d:\s+([\w-]+)\s+\|([^|]+)\|([^|]+)\|(.*)/);
    if(match != null) {
      var regobj = {};
      regobj.name = match[1];
      regobj.range = match[2].trim();
      regobj.desc = match[4].trim();
      if(regobj.range == 'literal') {
        match = regobj.desc.match(/(.*)options:(.*)/);
        if(match != null) {
          if(match[1] != '') {regobj.desc = match[1];}
          regobj.literals = match[2].split(',').sort();
        }
      }
      regmap.set(regobj.name,regobj);
    }
  }
  return regmap;  
}

//open a popup window to change the register values
function HMdeviceTools_changeRegister (device,peer) {
	var content = HMdeviceTools_openPopup(device,peer); //create popup window
	HMdeviceTools_initTemplateTable(device,peer); //create template elements

    //first get the register list
	var cmd = 'get ' +device+ ' regList';
	if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
    var url = HMdeviceTools_makeCommand(cmd);
    //http://fhem:8083/fhem?cmd=get%20HM_123456_Sw_01%20regList&XHR=1
    $.get(url,function(data){
        //parse register definitions into a map
        var regmap = HMdeviceTools_parseRegisterList(data);
        //get the current register values
        var cmd = 'get ' +device+ ' reg all';
        if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
        var url = HMdeviceTools_makeCommand(cmd);
        $.get(url,function(data){
            //create a table with all registers
            var div = document.createElement('div');
            content.appendChild(div);
            var table = document.createElement('table');
            div.appendChild(table);
            table.id = 'hm_reg_table';
            table.hidden = true;
            table.style.margin = '10px 0px 0px 0px';
            var colgroup = document.createElement('colgroup');
            table.appendChild(colgroup);
            var col1 = document.createElement('col');
            colgroup.appendChild(col1);
            col1.id = 'hm_reg_table_col1';
            col1.setAttribute('span','1');
            var col2 = document.createElement('col');
            colgroup.appendChild(col2);
            col2.id = 'hm_reg_table_col2';
            col2.setAttribute('span','3');
                    
            var thead = document.createElement('thead');
            table.appendChild(thead);
            var row = document.createElement('tr');
            thead.appendChild(row);
            var headerList = ['use','register','value (device)','description'];
            for(var h = 0; h < 4; ++h) { 
                var th = document.createElement('th');
                row.appendChild(th);
                if(h == 2) {th.id = 'hm_reg_headerVal';}
                th.setAttribute('scope','col');
                th.hidden = (h == 0);
                th.innerHTML = headerList[h];
            }
            var tbody = document.createElement('tbody');
            table.appendChild(tbody);
            
            var missedReg = "Register in 'get "+device+" reg all' are missing in 'get "+device+" regList'!";
            var missedVal = 'Some register values are not verified!';
            var lines = data.split('\n');
            var regCtr = 0, shCtr = 0, lgCtr = 0;
            for(var i = 2; i < lines.length; ++i) { //first line #3
                var line = lines[i];
                //var match = line.match(/(\d):([\w.-]*)\s+([\w-]+)\s+:([\w.:-]+)/);
                var match = line.match(/(\d):([\w.-]*)\s+([\w-]+)\s+:([^\s]+)/);
                if(match != null) {
                    var regname = match[3];
                    var regdesc = regmap.get(regname);
                    if(regdesc != null) { //sometimes regs not found in regList, bug in cul_hm
                        var regvalue = match[4];
                        var peerchn01 = peer + '_chn-01';
                        if(    (peer == match[2] || peerchn01 == match[2]) 
                            && (regname != 'pairCentral' && regname != 'sign')) {
                            if(regvalue.match(/^set_/) != null) {missedVal += '<br>- ' +regname+ ': ' + regvalue;}
                            ++regCtr;
                            if(regname.match(/^sh/)) {++shCtr;}
                            else if(regname.match(/^lg/)) {++lgCtr;}
                            //new row
                            var row = document.createElement('tr');
                            tbody.appendChild(row);
                            row.id = 'hm_reg_row_' + regname;
                            row.name = regname;
                            //column 1
                            var c1 = document.createElement('td');
                            row.appendChild(c1);
                            var tplParValue = 'off';
                            var select = document.createElement('select');
                            c1.appendChild(select);
                            select.title = 'use register in current template';
                            select.id = 'hm_tplt_reg_' + regname;
                            select.name = regname;
                            select.setAttribute('orgvalue',tplParValue);
                            select.style.width = 'auto';
                            select.style.margin = '0px 0px 0px 0px';
                            select.style.backgroundColor = 'white';
                            select.setAttribute('onchange',"HMdeviceTools_parseTemplateFromInputs('" +device+ "','" +peer+ "','hm_tplt_reg_" +regname+ "')");
                            select.setAttribute('onmousedown',"HMdeviceTools_updatePopupTpltRegOptions('hm_tplt_reg_" +regname+ "')");
                            for(var o = 0; o < 11; ++o) { //off,on,p0,p1, ...
                                var sel = (o == 0)? 'off': (o == 1)? 'on': 'p' + (o - 2);
                                var opt = document.createElement('option');
                                select.appendChild(opt);
                                opt.innerHTML = sel;
                                opt.id = 'hm_tplt_regOpt' +sel+ '_' + regname;
                                opt.value = sel;
                                opt.style.backgroundColor = (o == 0)? 'white': (o == 1)? 'lightgreen': 'white';
                                opt.selected = (sel == tplParValue);
                            }
                            //column 2
                            var c2 = document.createElement('td');
                            row.appendChild(c2);
                            c2.id = 'hm_reg_name_' + regname;
                            c2.name = regname;
                            c2.innerHTML = regname;
                            //column 3
                            var c3 = document.createElement('td');
                            row.appendChild(c3);
                            if(regdesc.literals == null) {
                                var input = document.createElement('input');
                                c3.appendChild(input);
                                input.id = 'hm_reg_val_' + regname;
                                input.name = regname;
                                input.setAttribute('orgvalue',regvalue);
                                input.setAttribute('tplvalue','');
                                input.setAttribute('onchange',"HMdeviceTools_updatePopupRegister('hm_reg_val_" +regname+ "')");
                                input.style.width = '140px';
                                input.style.margin = '0px 0px 0px 0px';
                                input.title = 'range:' +regdesc.range+ ' => current:' + regvalue;
                                input.placeholder = '(' +regvalue+ ')';
                                input.value = regvalue;
                            }
                            else {
                                var select = document.createElement('select');
                                c3.appendChild(select);
                                select.id = 'hm_reg_val_' + regname;
                                select.name = regname;
                                select.setAttribute('orgvalue',regvalue);
                                select.setAttribute('tplvalue','');
                                select.setAttribute('onchange',"HMdeviceTools_updatePopupRegister('hm_reg_val_" +regname+ "')");
                                select.style.width = '150px';
                                select.style.margin = '0px 0px 0px 0px';
                                select.title = ' => current:' + regvalue;
                                for(var l = 0; l < regdesc.literals.length; ++l) {
                                    var lit = regdesc.literals[l];
                                    var opt = document.createElement('option');
                                    select.appendChild(opt);
                                    opt.innerHTML = lit;
                                    opt.value = lit;
                                    opt.selected = (lit == regvalue);
                                    opt.style.backgroundColor = (lit == regvalue)? 'silver': 'white';
                                }
                            }
                            //column 4
                            var c4 = document.createElement('td');
                            row.appendChild(c4);
                            c4.id = 'hm_reg_desc_' + regname;
                            c4.innerHTML = regdesc.desc;
                        }
                    }
                    else {missedReg += '<br>- ' +regname;}
                }
            }
            //detection if registerset is good for generic template type
            if((shCtr + lgCtr) == regCtr && shCtr == lgCtr) {
                $('#hm_tplt_select').attr('generic','true');
                $("[id^='hm_reg_name_']").each(function() {
                    var nameGen = this.name.replace(/^(?:sh|lg)/,'');
                    this.setAttribute('namegen',nameGen);
                    var val = (this.name.match(/^sh/))? 'short': 'long';
                    this.setAttribute('class', val);
                });
                $("[id^='hm_reg_row_']").each(function() {
                    var val = (this.name.match(/^sh/))? 'short': 'long';
                    this.setAttribute('class', val);
                });
            }
            var last = document.createElement('div');
            content.appendChild(last);
            // output for template define
            var output = document.createElement('textarea');
            last.appendChild(output);
            output.id = 'hm_tplt_define';
            output.setAttribute('orgvalue','');
            output.value = '';
            output.title = 'the resulting define command for sharing with other users';
            output.hidden = true;
            output.readOnly = true;
            output.rows = 3;
            output.style.minWidth = 'calc(100% - 20px)';
            output.style.margin = '30px 0px 10px 0px';
            output.style.resize = 'none';
            output.style.backgroundColor = 'white';
            output.style.color = 'black';
            if(regCtr == 0 || missedVal != 'Some register values are not verified!') {
                missedVal += "<br><br>Please read the values first with 'set " +device+ " getConfig'";
                FW_okDialog(missedVal,0,function(){HMdeviceTools_cancelPopup(true);});
            }
            else {
                var hminfo = document.getElementById('HMdeviceTools_toolsTable').getAttribute('hminfo');
                if(hminfo != '') {HMdeviceTools_updateTemplateList(device,peer,'init');}
                else {HMdeviceTools_updatePopupMode(device,peer);}
                if(missedReg != "Register in 'get "+device+" reg all' are missing in 'get "+device+" regList'!") {
                    FW_okDialog(missedReg);
                }
            }
        });
    });
}

function HMdeviceTools_initTemplateTable(device,peer) {
	var content = document.getElementById(device +peer+ 'hm_popup_content');
	var hminfo = document.getElementById('HMdeviceTools_toolsTable').getAttribute('hminfo');

	var first = document.createElement('div');
	content.appendChild(first);
	first.id = 'hm_tplt_select_first';
	first.hidden = true;
	var table = document.createElement('table');
	first.appendChild(table);
	table.style.margin = '0px 0px 30px 0px';
	//table.style.tableLayout = 'auto';
	table.style.width = '100%';
    
    //row1(title)
	var row1 = document.createElement('tr');
	table.appendChild(row1);
	row1.style.whiteSpace = 'nowrap';
	row1.style.fontSize = '16px';
	row1.style.fontWeight = 'bold';

	var left = document.createElement('td');
	row1.appendChild(left);
	var left1 = document.createElement('span');
	left.appendChild(left1);
	left1.innerHTML = 'register configuration';
	left1.style.color = 'lightblue';
	var left2 = document.createElement('span');
	left.appendChild(left2);
	left2.innerHTML = ' ( ' +device+ ':' +((peer != '')? peer: 'general')+ ' )';

	var right = document.createElement('td');
	row1.appendChild(right);
	right.align = 'right';
	var err = document.createElement('a');
	right.appendChild(err);
	err.title = 'hminfo is not running';
	err.href = 'https://wiki.fhem.de/wiki/HomeMatic_HMInfo';
	var errText = document.createElement('span');
	err.appendChild(errText);
	errText.hidden = (hminfo != '');
	errText.innerHTML = ' ! ';
	errText.style.color = 'red';
	var help = document.createElement('a');
	right.appendChild(help);
	help.title = 'open wiki templates';
	help.href = 'https://wiki.fhem.de/wiki/HomeMatic_Templates';
	help.innerHTML = ' ? ';

    //row2
	var row2 = document.createElement('tr');
	table.appendChild(row2);
	var left = document.createElement('td');
	row2.appendChild(left);
	// use a drop down box to select the templates
	var select = document.createElement('select');
	left.appendChild(select);
	select.id = 'hm_tplt_select';
	select.setAttribute('device',device);
	select.setAttribute('peer',peer);
	select.setAttribute('generic','false');
	select.setAttribute('onchange',"HMdeviceTools_updatePopupMode('" +device+ "','" +peer+ "')");
	select.style.minWidth = '180px';
	select.style.margin = '20px 0px 0px 0px';
	var opt = document.createElement('option');
	select.appendChild(opt);
	opt.innerHTML = 'expert mode';
	opt.value = 'expert';
	opt.selected = true;
	opt.setAttribute('cat', 'white');
	opt.style.backgroundColor = 'white';
	//input for new template name
	var input = document.createElement('input');
	left.appendChild(input);
	input.id = 'hm_tplt_name';
	input.setAttribute('orgvalue','');
	input.value = '';
	input.title = 'please give me a good template name!';
	input.hidden = true;
	input.placeholder = 'new_template_name';
	input.setAttribute('onchange',"HMdeviceTools_parseTemplateFromInputs('" +device +"','" +peer+ "','hm_tplt_name')");
	input.style.minWidth = '180px';
	input.style.margin = '20px 0px 0px 10px';

	//drop down box for generic template type
	var right = document.createElement('td');
	row2.appendChild(right);
	right.align = 'right';
	var select = document.createElement('select');
	right.appendChild(select);
	select.id = 'hm_tplt_generic';
	select.setAttribute('orgvalue','');
	select.hidden = true;
	select.setAttribute('onchange',"HMdeviceTools_parseTemplateFromInputs('" +device+ "','" +peer+ "','hm_tplt_generic')");
	select.style.width = 'auto';
	select.style.margin = '20px 0px 0px 0px';
	var options = ['short AND long','generic from short','generic from long'];
	var values = ['','short','long'];
	for(var o = 0; o < 3; ++o) {
		var opt = document.createElement('option');
		select.appendChild(opt);
		opt.innerHTML = options[o];
		opt.value = values[o];
		opt.selected = (o == 0);
	}
	//select box for template details
	var select = document.createElement('select');
	right.appendChild(select);
	select.id = 'hm_tplt_details';
	select.setAttribute('orgvalue','basic');
	select.hidden = true;
	select.setAttribute('onchange','HMdeviceTools_updateTemplateDetails()');
	select.style.width = 'auto';
	select.style.margin = '20px 0px 0px 0px';
	var options = ['basic details','used register','register set','global usage','define','all details'];
	var values = ['basic','reg','regset','usg','def','all'];
	for(var o = 0; o < 6; ++o) {
		var opt = document.createElement('option');
		select.appendChild(opt);
		opt.innerHTML = options[o];
		opt.value = values[o];
		opt.selected = (o == 0);
	}

	//input for template info text
	var div = document.createElement('div');
	content.appendChild(div);

	var input = document.createElement("textarea");
	div.appendChild(input);
	input.id = "hm_tplt_info";
	input.setAttribute("orgvalue","");
	input.value = "";
	input.title = "please give me a good template info text!";
	input.hidden = true;
	input.placeholder = "new_template_info_text";
	input.rows = 3;
	input.style.minWidth = "calc(100% - 20px)";
	input.style.margin = "10px 0px 0px 0px";
	input.style.resize = "none";
	input.setAttribute('onchange',"HMdeviceTools_parseTemplateFromInputs('" +device+ "','" +peer+ "','" +input.id+ "')");

	var div = document.createElement("div");
	content.appendChild(div);

	// template parameter table
	var table = document.createElement("table");
	div.appendChild(table);
	table.setAttribute("id","hm_par_table");
	table.setAttribute("hidden",true);
	table.style.margin = '10px 0px 0px 0px';
	var thead = document.createElement("thead");
	table.appendChild(thead);
	var row = document.createElement("tr");
	thead.appendChild(row);
	row.id = "hm_tplt_parRow_header";
	row.hidden = true;
	var headerList = ["", "parameter", "value", "range", "description"];
	for(var h = 0; h < 5; ++h) { // 5 columns
		var thCol = document.createElement("th");
		row.appendChild(thCol);
		thCol.hidden = (h == 2 || h == 3);
		thCol.setAttribute("scope","col");
		thCol.innerHTML = headerList[h];
	}
	var tbody = document.createElement('tbody');
	table.appendChild(tbody);
	for(var r = 0; r < 9; ++r) { // init table for all 9 possible parameter
		var parId = 'p' + r;
		var row = document.createElement('tr');
		tbody.appendChild(row);
		row.id = 'hm_tplt_parRow_' + r;
		row.hidden = true;
		//row.style.backgroundColor = '#333';
		//row header
		var thRow = document.createElement('th');
		row.appendChild(thRow);
		thRow.setAttribute('scope','row');
		thRow.innerHTML = parId;
		//column 1: template parameter name (input/output)
		var c1 = document.createElement('td');
		row.appendChild(c1);
		c1.align = 'left';
		var inp = document.createElement('span');
		c1.appendChild(inp);
		inp.hidden = false;
		var input = document.createElement('input');
		inp.appendChild(input);
		input.id = 'hm_tplt_' +parId+ '_nameIn';
		input.name = parId;
		input.title = 'please give me a good parameter name!';
		input.style.width = '250px';
		input.style.margin = '0px 0px 0px 0px';
		input.setAttribute('onchange',"HMdeviceTools_parseTemplateFromInputs('" +device+ "','" +peer+ "','hm_tplt_" +parId+ "_nameIn')");
		input.setAttribute('ondblclick',"HMdeviceTools_setDefaultParName('" +device+ "','" +peer+ "','hm_tplt_" +parId+ "_nameIn')");
		var out = document.createElement('span');
		c1.appendChild(out);
		out.id = 'hm_tplt_' +parId+ '_nameOut';
		out.innerHTML = 'parameter_name' + r;
		out.hidden = true;
		//column 2: template parameter value
		var c2 = document.createElement('td');
		row.appendChild(c2);
		c2.id = 'hm_tplt_' +parId+ '_valCell';
		//column 3: template parameter value range
		var c3 = document.createElement('td');
		row.appendChild(c3);
		c3.innerHTML = 'new_parameter_range' + r;
		c3.hidden = true;
		//column 4: template parameter description
		var c4 = document.createElement('td');
		row.appendChild(c4);
		c4.id = 'hm_tplt_p' +r+ '_desc';
		c4.innerHTML = 'new_parameter_description' + r;
	}
	
	//init table for possible devices
	var div = document.createElement('div');
	content.appendChild(div);
	var table = document.createElement('table');
	div.appendChild(table);
	table.id = 'hm_dev_table';
	table.hidden = true;
	table.style.margin = '10px 0px 0px 0px';
	//table.style.tableLayout = 'auto';
	//table.style.width = 'auto';
	var thead = document.createElement('thead');
	table.appendChild(thead);
	var row = document.createElement('tr');
	thead.appendChild(row);
	row.id = 'hm_dev_row_header';
	var headerList = ['use','with device:peer','p0','p1','p2','p3','p4','p5','p6','p7','p8'];
	for(var h = 0; h < 11; ++h) { // 11 columns
		var thCol = document.createElement('th');
		row.appendChild(thCol);
		thCol.id = 'hm_dev_h' + h;
		thCol.hidden = (h > 1)? true: false;;
		thCol.innerHTML = headerList[h];
	}
	var tbody = document.createElement('tbody');
	table.appendChild(tbody);
	tbody.id = 'hm_dev_tbody';
}

function HMdeviceTools_appendRowForDeviceTable(entity,idx) {
	var tbody = document.getElementById('hm_dev_tbody');
	var row = document.createElement('tr');
	tbody.appendChild(row);
	row.id = 'hm_dev_row_' +entity+ ':' + idx;
	//column 1: checkbox, selected if device is assigned to template
	var c1 = document.createElement('td');
	row.appendChild(c1);
	c1.align = 'left';
	var check = document.createElement('input');
	c1.appendChild(check);
	check.id = 'hm_dev_use_' +entity+ ':' + idx;
	check.type = 'checkbox';
	check.checked = false;
	//check.value = 'on';
	check.setAttribute('orgvalue','off');
	check.style.margin = '5px 0px 0px 0px';
	check.setAttribute('onchange',"HMdeviceTools_updateUsedDevicesTable('hm_dev_use_" +entity+ ":" +idx+ "')");
	//column 2: device name
	var c2 = document.createElement('td');
	row.appendChild(c2);
	var a = document.createElement('a');
	c2.appendChild(a);
	a.href = '/fhem?detail=' + entity;
	a.style.cursor = 'pointer';
	var div = document.createElement('div');
	a.appendChild(div);
	div.id = 'hm_dev_name_' +entity+ ':' + idx;
	div.name = 'links';
	var strIdx = (idx == 0)? 'general': idx;
	div.innerHTML = entity + ':' + strIdx;
	//for all 9 possible pars
	for(var p = 0; p < 9; ++p) { // init table for possible pars
		var td = document.createElement('td');
		row.appendChild(td);
		td.id = 'hm_dev_p' +p+ '_' +entity+ ':' + idx;
		td.hidden = false;
		td.setAttribute('orgvalue','');
	}
	return row;
}
//onchange use-device-check-elements
function HMdeviceTools_updateUsedDevicesTable(id) { //1x HMdeviceTools_parseTemplateFromTemplateList, ^1x 
	var mId = id.match(/^hm_dev_([^_]+)_(.+)$/);
	if(mId != null) {
		var link = mId[2];
		var curDevice = document.getElementById('hm_tplt_select').getAttribute('device');
		var curPeer = document.getElementById('hm_tplt_select').getAttribute('peer');
		var curLink = curDevice + ':' + ((curPeer == '')? 0: curPeer);
		if(mId[1] != 'use' && curLink == link) {
			var input = document.getElementById(id);
			if(input.getAttribute('trigger') == '') {
				var nbr = mId[1].match(/\d$/);
				$('#hm_tplt_p' +nbr+ '_value').attr('trigger','sync');
				$('#hm_tplt_p' +nbr+ '_value').val(input.value);
				$('#hm_tplt_p' +nbr+ '_value').trigger('change');
			}
			else {input.setAttribute('trigger','');}
		}
		
		var inpCheck = document.getElementById('hm_dev_use_' + link);
		var checkIsChanged = (		inpCheck.getAttribute('orgvalue') == 'on' && inpCheck.checked == false 
								 || inpCheck.getAttribute('orgvalue') == 'off' && inpCheck.checked == true	);
		var inpParIsChanged = false; //true if any is changed
		var inpParsAreDefault = true; //true if all are default
		for(var i = 0; i < tplt.par.size; ++i) {
			var inp = document.getElementById('hm_dev_v' +i+ '_' + link);
			if(inp.getAttribute('orgvalue') != inp.value) {inpParIsChanged = true;} //TypeError: inp is null

			if(inp.getAttribute('orgvalue') != '') {inpParsAreDefault = false;}
		}
		var outDev = document.getElementById('hm_dev_name_' + link);
		if(checkIsChanged || inpParIsChanged && inpCheck.checked == true) {
			outDev.setAttribute('class','changed');
		}
		else {outDev.removeAttribute('class','changed');}
		
		//get current reg values for pars if you want to use the template (check)
		var linkParts = link.split(':');
		var device = linkParts[0];
		var peer = (linkParts[1] == 0)? '': linkParts[1];
		var peerIsExtern = (peer != '' && peer.match(/^self\d\d$/) == null);
		if(tplt.par.size > 0 && inpCheck.getAttribute('orgvalue') == 'off' && inpCheck.checked == true && inpParsAreDefault) {
			var peerChn01 = peer + '_chn-01';
			var cmd = 'get ' +device+ ' reg all';
			if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
			var url = HMdeviceTools_makeCommand(cmd);
			$.get(url,function(data) {
				var msg = '';
				var lines = data.split('\n');
				for(var p = 0; p < tplt.par.size; ++p) {
					var inp = document.getElementById('hm_dev_v' +p+ '_' + link);
					for(var i = 2; i < lines.length; ++i) { //first line #3
						var line = lines[i];
						var match = line.match(/(\d):([\w.-]*)\s+([\w-]+)\s+:([^\s]+)/);
						if(match != null) {
							var regPeer = match[2];
							var regName = match[3];
							var regValue = match[4];
							if((regPeer == peer || regPeer == peerChn01) && regName == inp.name) {
								if(peerIsExtern && inpCheck.hasAttribute('peersuffix') == false) {
									var suffix = (regPeer == peerChn01)? '_chn-01': '';
									inpCheck.setAttribute('peersuffix',suffix);
								}
								if(inp.nodeName == 'SELECT') { //whats the reason for this?
									var orgvalue = inp.getAttribute('orgvalue');
                                    //TypeError: inp.querySelector(...) is null
                                    if(inp.querySelector("option[value='" +orgvalue+ "']") != null) {
                                        inp.querySelector("option[value='" +orgvalue+ "']").remove();
                                    }
								}
								inp.value = regValue;
								inp.setAttribute('orgvalue',regValue);
								if(inp.nodeName == 'SELECT') {
									inp.querySelector("option[value='" +regValue+ "']").style.backgroundColor = 'silver';
								}
								else {
									inp.title = inp.title.replace(/current:.*$/,'current:' + regValue);
									inp.placeholder = '(' +regValue+ ')';
								}
								break;
							}
						}
					}
					if(inp.value == '') {msg += '<br>- ' +inp.name;}
				}
				if(msg != '') {
					var hminfo = document.getElementById('HMdeviceTools_toolsTable').getAttribute('hminfo');
					FW_okDialog('Some register values are not found for ' +device+ '!' +msg+ 
											"<br><br>Verify errors with 'get " +hminfo+ " configCheck'");
                    inpCheck.checked = false;
                    outDev.removeAttribute('class','changed');
				}
			});
		}
		else if(peerIsExtern && checkIsChanged && inpCheck.hasAttribute('peersuffix') == false) {
			var cmd = 'list ' +peer+ ' i:DEF i:chanNo';
			if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
			var url = HMdeviceTools_makeCommand(cmd);
			$.get(url,function(data) {
				//SwitchPBU06                                DEF             3913D3
				//																					 chanNo          01
				var lines = data.split('\n');
				var peerIsDevice = (lines[0].match(/[0-9A-F]+$/).length == 6);
				var suffix = '';
				if(peerIsDevice && lines.length > 1 && lines[1].match(/[0-9]+$/) == '01') {
					suffix = '_chn-01';
				}
				inpCheck.setAttribute('peersuffix',suffix);
			});
		}
	}
}

function HMdeviceTools_initRegisterTable() { //1x
	$("[id^='hm_reg_row_']").each(function() {this.classList.remove('template');});
	$("[id^='hm_tplt_reg_']").each(function() {
		this.value = 'off';
		this.setAttribute('orgvalue','off');
		this.disabled = false;
		this.style.backgroundColor = 'white';
	});
	$("[id^='hm_reg_name_']").each(function() {this.classList.remove('changed');});
	$("[id^='hm_reg_val_']").each(function() {
		this.value = this.getAttribute('orgvalue');
		this.setAttribute('tplvalue','');
		this.disabled = false;
	});
/* edit-mode
    //reg table
    $("[id^='hm_tplt_reg_']").prop('disabled',false);
	$("[id^='hm_reg_name_']").each(function() {this.classList.remove('changed');});
    $("[id^='hm_reg_val_']").each(function() {
        if($('#hm_tplt_reg_' + this.name).val() != 'on') {this.disabled = true;} //only used reg enabled
        else {this.disabled = false;}
    });
    $('#hm_reg_table').show();
*/
}


// update popup from template-dropdown
function HMdeviceTools_updatePopupMode(device,peer) { //1x HMdeviceTools_changeRegister, 4x
	tplt.name = '';
    $('#hm_tplt_name').val(tplt.name);
	tplt.type = '';
	tplt.info = '';
    $('#hm_tplt_info').val('');
    tplt.ass = [];
    tplt.dev.clear(); //entity:idx,save,use,pars[],tplts[]
	tplt.par.clear(); //par: id, name, value, masterReg, clients[]
	tplt.reg.clear(); //reg: name, value, parId, master

	var select = document.getElementById('hm_tplt_select');
	var value = select.value;
	select.style.backgroundColor = $("#hm_tplt_select option[value='" +value+ "']").attr('cat');
	$('#hm_tplt_select_first').show();
	HMdeviceTools_initRegisterTable();
	HMdeviceTools_changeRegNamesFromTemplateType();
	
	if (value == 'expert') { //######################################################################
		$('#hm_tplt_name').hide();
		$('#hm_tplt_generic').hide();
		$('#hm_tplt_details').hide();
		$('#hm_tplt_info').hide();
		$('#hm_par_table').hide();
		$('#hm_dev_table').hide();
        $('#hm_reg_headerVal').text('value (device)');
		$('#hm_reg_table th:nth-child(1),#hm_reg_table td:nth-child(1)').hide();
		$('#hm_reg_table').show();
		$('#hm_tplt_define').hide();
        
		$("[id^='hm_popup_btn_use']").hide();
		$('#hm_popup_btn_allOn').hide();
		$('#hm_popup_btn_allOff').hide();
		$('#hm_popup_btn_save').hide();
		$('#hm_popup_btn_edit').hide();
		$('#hm_popup_btn_check').hide();
		$('#hm_popup_btn_execute').hide();
		$('#hm_popup_btn_set').hide();
		$('#hm_popup_btn_unassign').hide();
		$('#hm_popup_btn_delete').hide();
		$('#hm_popup_btn_show').hide();
		$('#hm_popup_btn_define').hide();
		HMdeviceTools_showApplyBtn();
	} 
    else if (value == 'new') { //####################################################################
		$('#hm_tplt_name').show();
		$('#hm_tplt_generic').val('');
		(select.getAttribute('generic') == 'true')? $('#hm_tplt_generic').show(): $('#hm_tplt_generic').hide();
		$('#hm_tplt_details').hide();
		$('#hm_tplt_info').prop('readOnly',false);
		$('#hm_tplt_info').show();
		$('#hm_par_table th:nth-child(3),#hm_par_table td:nth-child(3)').hide(); //par value input
		$('#hm_tplt_parRow_header').hide();
		$("[id^='hm_tplt_parRow_']").hide();
		$('#hm_par_table').show();
		$('#hm_dev_table').hide();
        $('#hm_reg_headerVal').text('value (templ/dev)');
		$('#hm_reg_table th:nth-child(1),#hm_reg_table td:nth-child(1)').show(); //reg select input
		$('#hm_reg_table').show();
		$('#hm_tplt_define').val('');
		$('#hm_tplt_define').show();
        
		$("[id^='hm_popup_btn_use']").hide();
		$('#hm_popup_btn_allOn').show();
		$('#hm_popup_btn_allOff').show();
		$('#hm_popup_btn_save').hide();
		$('#hm_popup_btn_edit').hide();
		$('#hm_popup_btn_check').hide();
		$('#hm_popup_btn_execute').hide();
		$('#hm_popup_btn_set').hide();
		$('#hm_popup_btn_unassign').hide();
		$('#hm_popup_btn_delete').hide();
		$('#hm_popup_btn_show').show();
		$('#hm_popup_btn_define').show();
		$('#hm_popup_btn_apply').hide();
	} 
    else { //template name ##########################################################################
        $('#hm_tplt_name').hide();
        $('#hm_tplt_generic').hide();
        $('#hm_tplt_info').prop('readOnly',true);
        $('#hm_tplt_info').show();
		$('#hm_par_table').hide();
		$('#hm_dev_table').hide();
		$('#hm_reg_table').hide();
        $('#hm_reg_headerVal').text('value (templ/dev)');

		HMdeviceTools_parseTemplateFromTemplateList(device,peer,value);
		
		$('#hm_popup_btn_allOn').hide();
		$('#hm_popup_btn_allOff').hide();
		$('#hm_popup_btn_save').hide();
        $('#hm_popup_btn_edit').show();
		$('#hm_popup_btn_check').hide();
		$('#hm_popup_btn_show').hide();
		$('#hm_popup_btn_define').hide();
		$('#hm_popup_btn_apply').hide();
		var mode = $('#hm_tplt_details').val();
		var isUseMode = (mode == 'usg' || mode == 'all')? true: false;
		if(select.style.backgroundColor == 'lightgreen') {
            $('#hm_popup_btn_execute').show();
			$('#hm_popup_btn_set').attr('active','off');
			if(!isUseMode) {$('#hm_popup_btn_set').hide();}
			$('#hm_popup_btn_unassign').attr('active','on');
			if(!isUseMode) {$('#hm_popup_btn_unassign').show();}
			$('#hm_popup_btn_delete').hide();
		}
		else if(select.style.backgroundColor == 'yellow') {
            $('#hm_popup_btn_execute').hide();
			$('#hm_popup_btn_set').attr('active','on');
			if(!isUseMode) {$('#hm_popup_btn_set').show();}
			$('#hm_popup_btn_unassign').attr('active','off');
			if(!isUseMode) {$('#hm_popup_btn_unassign').hide();}
			$('#hm_popup_btn_delete').hide();
		}
		else if(select.style.backgroundColor == 'white') {
            $('#hm_popup_btn_execute').hide();
			$('#hm_popup_btn_set').attr('active','on');
			if(!isUseMode) {$('#hm_popup_btn_set').show();}
			$('#hm_popup_btn_unassign').attr('active','off');
			if(!isUseMode) {$('#hm_popup_btn_unassign').hide();}
			if(tplt.type != '') {
				var otherName = (tplt.type == 'short')? tplt.name + '_long': tplt.name + '_short';
				if($("#hm_tplt_select option[value='" +otherName+ "']").attr('cat') == 'white') {
					$('#hm_popup_btn_delete').show();
				}
				else {$('#hm_popup_btn_delete').hide();}
			}
			else {$('#hm_popup_btn_delete').show();}
		}
	}
}
function HMdeviceTools_updateTemplateDetails() { //1x HMdeviceTools_parseTemplateFromTemplateList, 1x dropdown
	var value = $('#hm_tplt_details').val(); //'basic','reg','regset','usg','def','all'

	//elements show allways
	$('#hm_tplt_details').show();
	$('#hm_par_table th:nth-child(3),#hm_par_table td:nth-child(3)').show(); //par value input
	$('#hm_par_table').show();

	//elements show sometimes
	$('#hm_reg_table').hide();
	$('#hm_reg_table th:nth-child(1),#hm_reg_table td:nth-child(1)').show(); //reg select input
	if(value == 'reg' || value == 'regset' || value == 'all') {
		var val = (value == 'all')? 'regset': value;
		var type = (tplt.type == '')? '': '.' + tplt.type;
		$("[id^='hm_reg_row_']").hide();
		if(val == 'reg') {$("[id^='hm_reg_row_'].template").show();}
		if(val == 'regset') {$("[id^='hm_reg_row_']" + type).show();}
		$('#hm_reg_table').show();
	}
	if(value == 'usg' || value == 'all') {
		($('#hm_popup_btn_use').attr('active') == 'on')? $('#hm_popup_btn_use').show(): $('#hm_popup_btn_use').hide();
		$('#hm_popup_btn_useAll').show();
		$('#hm_popup_btn_useNone').show();
		$('#hm_popup_btn_set').hide();
		$('#hm_popup_btn_unassign').hide();
		$('#hm_dev_table').show();
	}
	else {
		$('#hm_popup_btn_use').hide();
		$('#hm_popup_btn_useAll').hide();
		$('#hm_popup_btn_useNone').hide();
		($('#hm_popup_btn_set').attr('active') == 'on')? $('#hm_popup_btn_set').show(): $('#hm_popup_btn_set').hide();
		($('#hm_popup_btn_unassign').attr('active') == 'on')? $('#hm_popup_btn_unassign').show(): $('#hm_popup_btn_unassign').hide();
		$('#hm_dev_table').hide();
	}
	(value == 'def' || value == 'all')? $('#hm_tplt_define').show(): $('#hm_tplt_define').hide();
}

function HMdeviceTools_enterEditMode() {
    //prepare template elements
    $('#hm_tplt_select').prop('disabled',true);
    $('#hm_tplt_name').show();
    $('#hm_tplt_details').hide();
    ($('#hm_tplt_select').attr('generic') == 'true')? $('#hm_tplt_generic').show(): $('#hm_tplt_generic').hide();
    HMdeviceTools_changeRegNamesFromTemplateType(); // in selectmode always original regnames visible, not generic regnames
    $('#hm_tplt_info').prop('readOnly',false);
    $("[id*='_nameIn']").show();
    $("[id*='_nameOut']").hide();
    $('#hm_par_table th:nth-child(3),#hm_par_table td:nth-child(3)').hide(); //par value input
    $('#hm_par_table').show();
    $('#hm_dev_table').hide();
    //reg table
    $("[id^='hm_tplt_reg_']").prop('disabled',false);
	$("[id^='hm_reg_name_']").each(function() {this.classList.remove('changed');});
    $("[id^='hm_reg_val_']").each(function() {
        if($('#hm_tplt_reg_' + this.name).val() != 'on') {this.disabled = true;} //only used reg enabled
        else {this.disabled = false;}
    });
    $('#hm_reg_table').show();
    //define
    $('#hm_tplt_define').attr('orgvalue',$('#hm_tplt_define').val());
    $('#hm_tplt_define').show();
    
    //prepare buttons
    $("[id^='hm_popup_btn_use']").hide();
    $('#hm_popup_btn_allOn').show();
    $('#hm_popup_btn_allOff').show();
    $('#hm_popup_btn_save').show();
    $('#hm_popup_btn_edit').hide();
    $('#hm_popup_btn_set').hide();
    $('#hm_popup_btn_unassign').hide();
    $('#hm_popup_btn_execute').hide();
    $('#hm_popup_btn_delete').hide();
    $('#hm_popup_btn_show').show();
    $('#hm_popup_btn_define').hide();
    $('#hm_popup_btn_apply').hide();
}
function HMdeviceTools_leaveEditMode() {
    //prepare template elements
    $('#hm_tplt_select').prop('disabled',false);
    $('#hm_tplt_name').hide();
    $('#hm_tplt_details').show();
    $('#hm_tplt_generic').hide();
    HMdeviceTools_changeRegNamesFromTemplateType(); // in selectmode always original regnames visible, not generic regnames
    $('#hm_tplt_info').prop('readOnly',true);
    $("[id*='_nameIn']").hide();
    $("[id*='_nameOut']").show();
    $('#hm_par_table th:nth-child(3),#hm_par_table td:nth-child(3)').hide(); //par value input
    $('#hm_par_table').show();
    $('#hm_dev_table').show();
    //reg table
    $("[id^='hm_tplt_reg_']").prop('disabled',true);
    $('#hm_reg_table').show();
}


// toggle reg names from current template type
function HMdeviceTools_changeRegNamesFromTemplateType() { // 3x
	var type = tplt.type;
	$("[id^='hm_reg_name_']").each(function() { //change reg names generic/original
		var regName = this.name;
		var regNameGen = this.getAttribute('namegen');
		var isShort = (regName.match(/^sh/) != null)? true: false;
		var rowId = '#hm_reg_row_' + regName;
		if(type == 'short') {
			if(isShort) {
				this.innerHTML = regNameGen;
				$(rowId).show();
			}
			else {
				$(rowId).hide();
			}
		}
		else if(type == 'long') {
			if(isShort) {
				$(rowId).hide();
			}
			else {
				this.innerHTML = regNameGen;
				$(rowId).show();
			}
		}
		else {
			this.innerHTML = regName;
			$(rowId).show();
		}
	});
}

function HMdeviceTools_setDefaultParName(device,peer,id) {
    var inp = document.getElementById(id);    
    if(inp.value == '') {
        inp.value = inp.placeholder.replace('new_parameter_','');
		$('#' + id).trigger('change');
    }
}
// parse new template from inputs
function HMdeviceTools_parseTemplateFromInputs(device,peer,id) { //6x
	if(id != null) {
		/*input_element.id =>
			tplt.name:			hm_tplt_name
			tplt.type:			hm_tplt_name ('',_short,_long)
			tplt.info:			hm_tplt_info
			tplt.par.id:		hm_tplt_reg_<regname>
			tplt.par.name:	    hm_tplt_p<0...8>_nameIn
								hm_tplt_p<0...8>_nameOut
			tplt.par.value:     hm_tplt_p<0...8>_value
		*/
		var match = id.match(/^hm_tplt_([^_]+)(?:_(.*)|)$/);
		if(match != null) {
			var input = document.getElementById(id);
			if(     match[1] == 'reg') {                               // inputs: select register and parameter ##############
				var regObj  = {}; //reg: name, value, parId, master
				var newMasterReg  = {}; //reg: name, value, parId, master
				var newPar  = {}; //par: id, name, value, masterReg, clients[]
				var oldPar  = {}; //par: id, name, value, masterReg, clients[]
				var color = 'red';

				var regname = match[2];
				var newReg = !tplt.reg.has(regname);
				if(newReg) {
					regObj.name = regname;
					regObj.value = '';
					regObj.parId = '';
					regObj.master = false;
					color = 'lightgreen';
				}
				else {regObj = tplt.reg.get(regname);}
				var oldMaster = regObj.master;
				var oldParId = regObj.parId;
				var newParId = (input.value.match(/^p\d$/))? input.value: '';
				regObj.parId = newParId;
				
				//remove or change old par
				if(oldParId) {
					regObj.master =  false;
					oldPar = tplt.par.get(oldParId);
					if(oldMaster && oldPar.clients.length == 0) { //remove old single par
						tplt.par.delete(oldParId);
					}
					else { //change old multi par
						if(oldMaster && oldPar.clients.length > 0) { //change master, change par description?
							oldPar.masterReg = oldPar.clients.shift();
							newMasterReg = tplt.reg.get(oldPar.masterReg);
							newMasterReg.master = true;
							tplt.reg.set(newMasterReg.name,newMasterReg);
						}
						else { //remove client
							var pos = oldPar.clients.indexOf(regname);
							oldPar.clients.splice(pos,1);
						}
						if(oldPar.clients.length == 0) { //change color on other input if single par
							document.getElementById('hm_tplt_reg_' + oldPar.masterReg).style.backgroundColor = 'yellow';
						}
						tplt.par.set(oldParId,oldPar);
					}
				}
				//add or change new par
				if(newParId) {
					if(tplt.par.has(newParId)) { //new par as client
						regObj.master =  false;
						newPar = tplt.par.get(newParId);
						if(newPar.clients.length == 0) { //change color on other inputs
							document.getElementById('hm_tplt_reg_' +  newPar.masterReg).style.backgroundColor = 'orange';
						}
						newPar.clients.push(regname);
						color = 'orange';
					}
					else { //new par as master
						regObj.master =  true;
						newPar.id = newParId;
						newPar.name = '';
						newPar.value = '';
						newPar.masterReg = regname;
						newPar.clients = [];
						color = 'yellow';
					}
					tplt.par.set(newParId,newPar);
				}
				if(input.value == 'off') {
					tplt.reg.delete(regname);
					color = 'white';
				}
				else {
					tplt.reg.set(regname,regObj);
					if(input.value == 'on') {color = 'lightgreen';}
				}
				//style input element
				input.style.backgroundColor = color;
				//show parameter table
				(tplt.par.size == 0)? $('#hm_tplt_parRow_header').hide(): $('#hm_tplt_parRow_header').show();
				for(var p = 0; p < 9; ++p) {
					var parId = 'p' + p;
					if(tplt.par.has(parId)) {
						$('#hm_tplt_parRow_' + p).show();
						var parObj = tplt.par.get(parId);
						var inpParName = document.getElementById('hm_tplt_' +parId+ '_nameIn');					
						inpParName.placeholder = 'new_parameter_' + parObj.masterReg;
						inpParName.value = parObj.name;
						inpParName.hidden = false;
						var outParName = document.getElementById('hm_tplt_' +parId+ '_nameOut');					
						outParName.hidden = true;
						var parDesc = document.getElementById('hm_tplt_' +parId+ '_desc');					
						parDesc.innerHTML = document.getElementById('hm_reg_desc_' + parObj.masterReg).innerHTML;
					}
					else {$('#hm_tplt_parRow_' + p).hide();}
				}
                //handle regValue input
                var inpReg = document.getElementById('hm_reg_val_' + input.name);
                var orgRegVal = inpReg.getAttribute('orgvalue');
                var tplRegVal = inpReg.getAttribute('tplvalue');
                var outName = $('#hm_reg_name_' + input.name);
                var mode = $('#hm_tplt_select').val();
                if(mode != 'expert' && mode != 'new') {mode = 'select';}
                if(mode == 'select' && $('#hm_tplt_name').is(':visible')) {mode = 'edit';}

                var normalCol = document.getElementById('hm_reg_table').style.backgroundColor;
                var actionCol = '#888888';
                if(input.value == 'on') {
                    inpReg.disabled = false;
                    inpReg.value = (tplRegVal != '')? tplRegVal: orgRegVal;
                    if(input.value != input.getAttribute('orgvalue') || inpReg.value != tplRegVal) {
                        document.getElementById('hm_reg_row_' + input.name).style.backgroundColor = actionCol;
                        //$(outName).addClass('changed');
                    }
                    else {
                        document.getElementById('hm_reg_row_' + input.name).style.backgroundColor = normalCol;
                        //$(outName).removeClass('changed');
                    }
                }
                else if(input.value.match(/^p\d$/)) {
                    inpReg.disabled = true;
                    inpReg.value = (tplRegVal != '')? tplRegVal: orgRegVal;
                    if(input.value != input.getAttribute('orgvalue') || inpReg.value != tplRegVal) {
                        document.getElementById('hm_reg_row_' + input.name).style.backgroundColor = actionCol;
                        //$(outName).addClass('changed');
                    }
                    else {
                        document.getElementById('hm_reg_row_' + input.name).style.backgroundColor = normalCol;
                        //$(outName).removeClass('changed');
                    }
                }
                else {//off
                    inpReg.disabled = true;
                    inpReg.value = orgRegVal;
                    if(input.value != input.getAttribute('orgvalue') || inpReg.value != orgRegVal) {
                        document.getElementById('hm_reg_row_' + input.name).style.backgroundColor = actionCol;
                        //$(outName).addClass('changed');
                    }
                    else {
                        document.getElementById('hm_reg_row_' + input.name).style.backgroundColor = normalCol;
                        //$(outName).removeClass('changed');
                    }
                }
			}
			else if(match[1] == 'name') {                              // inputs: template name ##############################
				var hminfo = document.getElementById('HMdeviceTools_toolsTable').getAttribute('hminfo');
				var alertMsg = '';
				var name = input.value;
				var goodName = true;
				//check if name is already in use and suffix for type=both is not _short or _long
				if(name.match(/_(?:short|long)$/) == null) {
					//defined tempates:
					//autoOff    params:time   Info:staircase - auto off after -time-, extend time with each trigger
					var cmd = 'get ' +hminfo+ ' templateList all';
					if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
					var url = HMdeviceTools_makeCommand(cmd);
					$.get(url, function(data){
						var lines = data.split('\n');
						for(var i = 1; i < lines.length; ++i) {
							var line = lines[i];
							var mline = line.match(/^([^\s]+)\s+params:(.*)Info:(.*)$/);
							if( mline != null ) {
								if(mline[1] == name) {
									goodName = false;
									FW_okDialog("Invalid template name (" +name+ ")!<br><br>- The name is already defined!<br>- Delete it first or make a better one");
									break;
								}
							}
						}
					});
				}
				else {
					goodName = false;
					FW_okDialog("Invalid template name (" +name+ ")!<br><br>- Suffix '_short' or '_long' is not allowed");
				}
				if(goodName) {tplt.name = name;}
			}
			else if(match[1] == 'generic') {                           // inputs: generic mode ###############################
				HMdeviceTools_turnOnOffAllRegs('off');
				tplt.type = input.value;
				HMdeviceTools_changeRegNamesFromTemplateType();
			}
			else if(match[1] == 'info') {                              // inputs: template info ##############################
				tplt.info = input.value.replace(/\n/g, '@');
			}
			else if(match[1].match(/^p\d$/) && match[2] == "nameIn") { // inputs: parameter name #############################
				var parId = match[1];
				var par = tplt.par.get(parId);
				par.name = input.value;
				tplt.par.set(parId, par);
			}
			else if(match[1].match(/^p\d$/) && match[2] == 'value') {  // inputs: parameter value ############################
				if(input.getAttribute('trigger') == '') {
					var link = device.replace(/\./g,'\\.') + '\\:' + ((peer == '')? 0: peer.replace(/\./g,'\\.'));
					var nbr = match[1].match(/\d$/);
					$('#hm_dev_v' +nbr+ '_' + link).attr('trigger','sync');
					$('#hm_dev_v' +nbr+ '_' + link).val(input.value);
					$('#hm_dev_v' +nbr+ '_' + link).trigger('change');
				}
				else {input.setAttribute('trigger','');}
				var parId = match[1];
				var par = tplt.par.get(parId);
				par.value = input.value;
				tplt.par.set(parId,par);
				var showSet = false;
				for(var p = 0; p < tplt.par.size; ++p) {
					var inpPar = document.getElementById('hm_tplt_p' +p+ '_value');
					if(inpPar.value != inpPar.getAttribute('orgvalue')) {
						showSet = true;
						$('#hm_tplt_p' +p+ '_nameOut').attr('class','changed');
					}
					else {$('#hm_tplt_p' +p+ '_nameOut').removeAttr('class');}
				}
				if(document.getElementById('hm_tplt_select').style.backgroundColor == 'white') {showSet = true;}
				else if(document.getElementById('hm_tplt_select').style.backgroundColor == 'yellow') {showSet = true;}
				var mode = $('#hm_tplt_details').val();
				var isUseMode = (mode == 'usg' || mode == 'all')? true: false;
				if(showSet) {
					$('#hm_popup_btn_set').attr('active','on');
					if(!isUseMode) {$('#hm_popup_btn_set').show();}
				}
				else {
					$('#hm_popup_btn_set').attr('active','off');
					if(!isUseMode) {$('#hm_popup_btn_set').hide();}
				}
			}
		}
	}
}

// parse existing template from hminfo
function HMdeviceTools_parseTemplateFromTemplateList(entity,peer,template) { //1x HMdeviceTools_updatePopupMode (for every template)
	var cmd = '{';
    cmd += 'my @arr;;';
    cmd += 'foreach my $e (devspec2array("TYPE=CUL_HM:FILTER=model!=(ACTIONDETECTOR|CCU-FHEM|VIRTUAL)")){';
    cmd +=   'if($defs{$e}{helper}{cmds}{lst}{tplChan} =~ m/(^|,)' +template+ '(,|$)/){';
    cmd +=     'push(@arr,$e.":0");;';
    cmd +=   '} ';
    cmd +=   'elsif($defs{$e}{helper}{cmds}{lst}{tplPeer} =~ m/(^|,)' +template+ '(,|$)/){';
    cmd +=     'push(@arr,$e.":".$_) foreach(sort(CUL_HM_getPeers($e,"Names")));;';
    cmd +=   '}';
    cmd += '}';
    cmd += 'return join(",",@arr);;';
    cmd += '}';
	if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
	var url = HMdeviceTools_makeCommand(cmd);
	$.get(url, function(data){
        var idx = (peer != '')? peer: 0;
        var links = data.trim().split(',');//newline at the end!!!
        $('#hm_dev_tbody').empty();
        links.forEach((item) => {
            var devObj = {link: '',save: true,use: false,pars: [],tplts: []}; //dev:link(entity:idx),save,use,pars[],tplts[]
            devObj.link = item;
            tplt.dev.set(item, devObj);
            var itemParts = item.split(':');
            var row = HMdeviceTools_appendRowForDeviceTable(itemParts[0],itemParts[1]);
            if(itemParts[0] == entity && itemParts[1] == idx) {
                row.style.backgroundColor = '#888888';
                if(itemParts[1] != 0 && itemParts[1].match(/^self\d\d$/) == null) { //peer is extern
                    var inpCheck = document.getElementById('hm_dev_use_' +entity+ ':' + idx);
                    var suffix = document.getElementById('HMdeviceTools_reg_link_' + idx).getAttribute('peersuffix');
                    inpCheck.setAttribute('peersuffix',suffix);
                }
            }
        });
        
        var match = template.match(/^(.+?)(?:_(short|long))?$/);
        if(match != null) {
            tplt.name = match[1];
            $('#hm_tplt_name').val(tplt.name);
            $('#hm_tplt_name').attr('orgvalue',tplt.name);
            if(match[2] != undefined) {
                tplt.type = match[2];
                $('#hm_tplt_generic').attr('orgvalue',tplt.type);
                $('#hm_tplt_generic').val(tplt.type);
            }
        }
        var type = (tplt.type == 'short')? 'sh': (tplt.type == 'long')? 'lg': '';
        var hminfo = document.getElementById('HMdeviceTools_toolsTable').getAttribute('hminfo');
        var cmd = 'get ' +hminfo+ ' templateList ' + tplt.name;
        if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
        var url = HMdeviceTools_makeCommand(cmd);
        $.get(url,function(data) {
            /*
            test2            params:backlOnMode backlOnTime  Info:y
                backlOnMode      :backlOnMode
                backlOnTime      :backlOnTime
                btnLock          :on
                burstRx          :on
            */
            var lines = data.split('\n');
            for(var i = 0; i < lines.length; ++i) {
                var line = lines[i];
                if(i == 0) { //line #1 => parameter,info
                    //test2            params:backlOnMode backlOnTime  Info:y
                    var mline = line.match(/params:(.*)Info:(.*)$/);
                    if(mline != null) {
                        tplt.info = mline[2];
                        $('#hm_tplt_info').val(tplt.info.replace(/@/g, '\n'));
                        if(mline[1].match(/^\s/) == null) { //we have parameter
                            var params = mline[1].trim().split(' ');
                            for(var p = 0; p < params.length; ++p) {
                                var newPar = {};
                                var parId = 'p' + p;
                                newPar.id = parId;
                                newPar.name = params[p];
                                newPar.value = '';
                                newPar.masterReg = '';
                                newPar.clients = [];
                                tplt.par.set(parId, newPar);
                            }
                        }
                    }
                }
                else { //line #2... => register
                    //	backlOnMode      :backlOnMode
                    var mline = line.match(/([\w-]+)\s+:(.*)$/);
                    if(mline != null) {
                        var regName = type + mline[1];
                        var regValue = mline[2];
                        var newReg = {};
                        newReg.name = regName;
                        newReg.value = regValue;
                        newReg.parId = '';
                        newReg.master = false;
                        var regRow = document.getElementById('hm_reg_row_' + regName);
                        regRow.classList.add('template');
                        var inpRegUse = document.getElementById('hm_tplt_reg_' + regName);
                        inpRegUse.value = 'on';
                        var inpRegVal = document.getElementById('hm_reg_val_' + regName);
                        inpRegVal.setAttribute('tplvalue',regValue);
                        inpRegVal.value = regValue; // inputelemente erhalten registerwerte des templates (wert oder parametername!!!)
                        if(tplt.par.size > 0) {
                            for(var p = 0; p < tplt.par.size; ++p) { //look for all par
                                var parId = 'p' + p;
                                var newPar = tplt.par.get(parId);
                                if(newReg.value == newPar.name) { //reg use par if reg.value == par.name
                                    newReg.value = '';
                                    newReg.parId = parId;
                                    inpRegUse.value = parId;
                                    if(newPar.masterReg != '') {newPar.clients.push(regName);} //multi par
                                    else { //new par
                                        newReg.master = true;
                                        newPar.masterReg = regName;
                                        //var parValue = ''; //inpRegVal.getAttribute('orgvalue') => better???;
                                        var parValue = inpRegVal.getAttribute('orgvalue');
                                        inpRegVal.value = parValue; // parametername von oben wird nun mit parameterwert getauscht ('' => unknown).
                                        inpRegVal.setAttribute('tplvalue',parValue);
                                        var inpPar = inpRegVal.cloneNode(true);
                                        var cell = document.getElementById('hm_tplt_' +parId+ '_valCell');
                                        $('#hm_tplt_' + parId + '_valCell').empty();
                                        cell.appendChild(inpPar);
                                        inpPar.id = 'hm_tplt_' +parId+ '_value';
                                        inpPar.value = parValue;
                                        inpPar.setAttribute('orgvalue',parValue);
                                        inpPar.setAttribute('trigger','');
                                        inpPar.setAttribute('onchange',"HMdeviceTools_parseTemplateFromInputs('" +entity+ "','" +peer+ "','hm_tplt_" + parId + "_value')");
                                        var curLink = entity + ':' + ((peer == '')? 0: peer);
                                        $("[id^='hm_dev_" +parId+ "_']").each(function() {
                                            var inpPar = inpRegVal.cloneNode(true);
                                            this.appendChild(inpPar);
                                            var mLink = this.id.match('^hm_dev_' +parId+ '_(.+)$');
                                            var link = mLink[1];
                                            inpPar.id = 'hm_dev_v' +p+ '_' + link;
                                            if(inpPar.nodeName == 'SELECT') {
                                                inpPar.style.width = 'auto';
                                                if(link != curLink) {
                                                    inpPar.title = inpPar.title.replace(/current:.*$/,'current:unknown');
                                                    var orgvalue = inpPar.getAttribute('orgvalue');
                                                    inpPar.querySelector("option[value='" +orgvalue+ "']").style.backgroundColor = 'white';
                                                    var opt = document.createElement('option');
                                                    inpPar.insertBefore(opt,inpPar.firstChild);
                                                    opt.innerHTML = '';
                                                    opt.value = '';
                                                    opt.style.backgroundColor = 'silver';
                                                }
                                            }
                                            else {
                                                if(link != curLink) {
                                                    inpPar.title = inpPar.title.replace(/current:.*$/,'current:unknown');
                                                    inpPar.placeholder = '(...)';
                                                }
                                                inpPar.style.width = '50px';
                                            }
                                            var value = (link == curLink)? parValue: '';
                                            inpPar.value = value;
                                            inpPar.setAttribute('orgvalue',value);
                                            inpPar.setAttribute('trigger','');
                                            inpPar.setAttribute('onchange',"HMdeviceTools_updateUsedDevicesTable('hm_dev_v" +p+ "_" +link+ "')");
                                        });
                                    }
                                    tplt.par.set(parId, newPar);
                                    break;
                                }
                            }
                        }
                        tplt.reg.set(regName,newReg);
                    }
                }
            }

            //HMdeviceTools_getTemplateUsage(entity,peer,tplt.name,tplt.type); // we need parameter values
            
            //get hminfo templateUsgG [sortPeer|sortTemplate|noTmpl|all]
            var cmd = 'get ' +hminfo+ ' templateUsgG all';
            if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
            var url = HMdeviceTools_makeCommand(cmd);
            $.get(url,function(data) { //get used parameter values
                tplt.ass = [];
                var lines = data.split('\n');
                for(var l = 0; l < lines.length; ++l) {
                    var line = lines[l];
                    if(line != '') { // '' => template not in use
                        //Thermostat.OZ        |0              |tc1    |a:auto b:15 c:off d:off
                        //Thermostat.SZ_Climate|0              |s1     |
                        //HM_3913D3            |self02:short   |autoOff|time:unused
                        //SwitchPBU06          |Tuer.SZ:short  |autoOff|time:15
                        //SwitchPBU06          |0              |ES_00  |powerUpAction:off
                        var mLine = line.match(/^([^|]+)\|([^:|]+)(?::(\w+))?\s*\|([^|]+)\|(.*)$/);
                        var usedDevice = mLine[1].trim();
                        var usedPeer = mLine[2].trim().replace(/_chn-01/,'');
                        var usedLink = usedDevice + ':' + usedPeer;

                        if(tplt.dev.has(usedLink)) { //if row exist in device table
                            var devObj = tplt.dev.get(usedLink);
                            var usedPeerType = (mLine[3] == undefined)? '': mLine[3];
                            var usedType = (usedPeerType == 'both')? '': usedPeerType;
                            var usedTemplate = mLine[4].trim();
                            var usedTplt = usedTemplate + ((usedType != '')? '_' + usedType: '');
                            
                            if(!devObj.tplts.includes(usedTplt)) {devObj.tplts.push(usedTplt);}
                            if(devObj.tplts.length > 0) {
                                var linkName = document.getElementById('hm_dev_name_' + usedLink);
                                linkName.style.color = devObj.tplts.length > 1? 'orange': 'yellow'; //links with templates becomes color
                                linkName.title = 'assigned templates:\n => ' + devObj.tplts.sort().join("\n => ");
                            }

                            if(usedTemplate == tplt.name) {
                                tplt.ass.push(usedDevice +','+ usedPeer + ((usedPeerType != '')? ':' + usedPeerType: ''));

                                if(usedType == tplt.type) {
                                    devObj.use = true;
                                    var inpCheck = document.getElementById('hm_dev_use_' + usedLink);
                                    inpCheck.checked = true;
                                    inpCheck.setAttribute('orgvalue','on');
                                    
                                    var mPars = mLine[5].trim().split(' ');
                                    if(mPars != '') { //template use pars
                                        for(var p = 0; p < mPars.length; ++p) {
                                            var parId = 'p' + p;
                                            var mPar = mPars[p].split(':');
                                            var parValue = mPar[1];
                                            devObj.pars.push(parValue);
                                            var inpPar = document.getElementById('hm_dev_v' +p+ '_' + usedLink);
                                            inpPar.value = parValue;
                                            inpPar.setAttribute('orgvalue',parValue);
                                            inpPar.title = inpPar.title.replace(/current:.*$/,'current:' + parValue);
                                            if(inpPar.nodeName != 'SELECT') {
                                                inpPar.placeholder = '(' +parValue+ ')';
                                            }
                                            if(usedDevice == entity && usedPeer == idx) { 
                                                var parObj = tplt.par.get(parId);
                                                parObj.value = parValue;
                                                tplt.par.set(parId,parObj);
                                                var inpPar = document.getElementById('hm_tplt_' +parId+ '_value');
                                                inpPar.value = parValue;
                                                inpPar.setAttribute('orgvalue',parValue);
                                                inpPar.title = inpPar.title.replace(/current:.*$/,'current:' + parValue);
                                                if(inpPar.nodeName != 'SELECT') {
                                                    inpPar.placeholder = '(' +parValue+ ')';
                                                }
                                                var inpReg = document.getElementById('hm_reg_val_' + inpPar.name);
                                                inpReg.value = parValue;
                                                inpReg.setAttribute('tplvalue',parValue);
                                            }
                                        }
                                    }
                                }
                            }
                            tplt.dev.set(usedLink, devObj);
                        }
                    }
                }
                
                //detection to show the use-button
                var observer = new MutationObserver(function callback(mutationList,observer) {
                    mutationList.forEach((mutation) => {
                        switch(mutation.type){
                            case 'childList':
                                break;
                            case 'attributes':
                                if(mutation.attributeName == 'class') {
                                    var mode = $('#hm_tplt_details').val();
                                    var isUseMode = (mode == 'usg' || mode == 'all')? true: false;
                                    var changedDevices = $("[id^='hm_dev_name_'].changed");
                                    if(changedDevices.length > 0) {
                                        $('#hm_popup_btn_use').attr('active','on');
                                        if(isUseMode) {$('#hm_popup_btn_use').show();}
                                    }
                                    else {
                                        $('#hm_popup_btn_use').attr('active','off');
                                        if(isUseMode) {$('#hm_popup_btn_use').hide();}
                                    }
                                }
                                break;
                            case 'subtree':
                                break;
                        }
                    });
                });
                var observerOptions = {childList: false, attributes: true, subtree: false};
                $("[id^='hm_dev_name_']").each(function() {observer.observe(this,observerOptions);});
                
                // show parameter table
                (tplt.par.size == 0)? $('#hm_tplt_parRow_header').hide(): $('#hm_tplt_parRow_header').show();
                for(var p = 0; p < 9; ++p) {
                    var parId = 'p' + p;
                    if(tplt.par.has(parId)) {
                        $('#hm_tplt_parRow_' + p).show();				
                        var newPar = tplt.par.get(parId);
                        var inpParName = document.getElementById("hm_tplt_" + parId + "_nameIn");	
                        inpParName.placeholder = 'new_parameter_' + newPar.masterReg;
                        inpParName.value = newPar.name;
                        inpParName.hidden = true;
                        var outParName = document.getElementById("hm_tplt_" + parId + "_nameOut");					
                        outParName.innerHTML = newPar.name;
                        outParName.hidden = false;
                        outParName.removeAttribute('class');
                        var inpParValue = document.getElementById("hm_tplt_" + parId + "_value");
                        inpParValue.hidden = false;
                        var parDesc = document.getElementById("hm_tplt_" + parId + "_desc");					
                        parDesc.innerHTML = document.getElementById("hm_reg_desc_" + newPar.masterReg).innerHTML;
                    }
                    else {$('#hm_tplt_parRow_' + p).hide();}
                }
                // show device table columns
                for(var p = 0; p < 9; ++p) {
                    $("[id^='hm_dev_h" +(p+2)+ "']").each(function() {this.hidden = (p > tplt.par.size -1)? true: false;});
                    $("[id^='hm_dev_p" +p+ "']").each(function() {this.hidden = (p > tplt.par.size -1)? true: false;});
                }
                // show colors in reg table
                $("[id^='hm_tplt_reg_']").each(function() {
                    this.disabled = true;
                    this.setAttribute('orgvalue',this.value);
                    if(this.value == 'off') {this.style.backgroundColor = 'white';}
                    else if(this.value == 'on') {this.style.backgroundColor = 'lightgreen';}
                    else if(tplt.par.size > 0) {
                        this.style.backgroundColor = (tplt.par.get(this.value).clients.length == 0)? 'yellow': 'orange';
                    }
                });
                $("[id^='hm_reg_val_']").each(function() {
                    this.disabled = true;
                    var idName = this.id.replace(/_val_/,'_name_');
                    if(this.value != this.getAttribute('orgvalue')) {$('#' + idName).attr('class','changed');}
                    else {$('#' + idName).removeAttr('class');}
                });
                
                $('#hm_tplt_define').val(HMdeviceTools_makeCmdDefineTemplate());
                $('#hm_popup_btn_use').attr('active','off');
                HMdeviceTools_updateTemplateDetails();
            });
        });
	});
}

// after template action make a new template dropdown
function HMdeviceTools_updateTemplateList(device,peer,selOption) { //8x => 7x btn_action, 1x create_popup (init)
	var select = document.getElementById('hm_tplt_select');
	var cmd = 'jsonlist2 ' + device;
	if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
	var url = HMdeviceTools_makeCommand(cmd);
	$.getJSON(url,function(data) {
		var object = data.Results[0];
		if(object != null) {
			var idx = (peer == '')? 0: peer;
			//tplSet_0:TC_01_sensor,TC_01_sensor1,test1
			//tplSet_Tuer.SZ_chn-01:SwCondAbove_long,SwCondAbove_short
			var match = object.PossibleSets.match('(tplSet_' +idx+ '(?:_chn-01)?:)([^\\s]+)');
			var availableTemplates = (match)? match[2].split(',').sort(): [];
			var hminfo = document.getElementById('HMdeviceTools_toolsTable').getAttribute('hminfo');
			var cmd = 'get ' +hminfo+ ' templateUsgG sortTemplate';
			if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
			var url = HMdeviceTools_makeCommand(cmd);
			$.get(url,function(data) {
				if(data != undefined) {
					var tuMap = new Map(); //name,useOwn,links[[]]
					var lines = data.split('\n');
					for(var i = 0; i < lines.length; ++i) {
						var line = lines[i];
                        /*
                        ES_device             |HM_3913D3            |0               |visib off
                        TC_02_test            |Thermostat.GZ_Climate|0               |central temp-only
                        TC_02_test            |Thermostat.OZ_Climate|0               |central temp-hum
                        single-chn-sensor-peer|Tuer.SZ              |SwitchPBU06:both|
                        autoOff               |SwitchPBU06          |Tuer.SZ:short   |15
                        autoOff               |HM_3913D3            |self02:short    |unused
                        autoOff               |SwitchES01_Sw        |self01:short    |1800
                        s1                    |Thermostat.SZ_Climate|0               |
                        tc1                   |Thermostat.OZ        |0               |auto 20 off off
                        */
						var match = line.match(/^([^|]+)\|([^|]+)\|([^:|]+)(?::(\w+))?\|(.*)$/);
						if(match != null) { //no empty lines
							var type = (match[4] == undefined)? '': match[4];
							var usedName = match[1].trim() + ((type == '' || type == 'both')? '': '_' + type);
							var usedDevice = match[2].trim();
							var usedPeer = match[3];
							var specialPeer = false;
							if(usedPeer.match(/_chn-01/)) {
								specialPeer = true;
								usedPeer = usedPeer.replace(/_chn-01/,'');
							}
							var usedLink = usedDevice + ':' + usedPeer;
							var usedValues = (match[5] == undefined)? []: match[5].trim().split(' ');
							usedValues.unshift(specialPeer);
							usedValues.unshift(usedLink);
							var tuObj = {}; //t(plt)u(sed)Obj(ect) => name,useOwn,links[link,special,p0,p1,...]
							tuObj.name = usedName;
							var isUseOwn = (usedDevice == device && usedPeer == idx);
							if(tuMap.has(usedName)) { //second or higher use for this template
								tuObj.useOwn = (isUseOwn)? true: tuMap.get(usedName).useOwn;
								var links = tuMap.get(usedName).links;
								links.push(usedValues);
								tuObj.links = links;
							}
							else { //first use for this template
								tuObj.useOwn = isUseOwn;
								tuObj.links = [usedValues];
							}
							tuMap.set(usedName,tuObj);
						}
					}
					$('#hm_tplt_select').empty();
					var text = '';
					var value = '';
					var color = 'red';
                    var title = '';
					var greenCtr = 0;
					for(var m = 0; m < availableTemplates.length + 2; ++m) {//all options in dropdown
						if(m == 0) {
							text = 'expert mode';
							value = 'expert';
							color = 'white';
                            title = "register configuration";
						}
						else if(m == 1) {
							text = 'new template...';
							value = 'new';
							color = 'white';
                            title = "new template definition";
						}
						else {
							text = availableTemplates[m - 2];
							value = availableTemplates[m - 2];
							if(tuMap.has(availableTemplates[m - 2])) { //tuMap: name,useOwn,links[[]]
								color = (tuMap.get(availableTemplates[m - 2]).useOwn)? 'lightgreen': 'yellow';
							}
							else {color = "white";}
                            title = '';
						}
						if (color == "lightgreen") {++greenCtr;}
						var opt = document.createElement('option');
						select.appendChild(opt);
						opt.innerHTML = text;
						opt.value = value;
						opt.style.backgroundColor = color;
                        opt.title = title;
						opt.setAttribute('cat', color);
						if(selOption != 'init') {opt.selected = (selOption == value);}
						else { //select the first used (green) template if possible
							opt.selected = (color == 'lightgreen' && greenCtr == 1);
						}
					}
                    //show tplt-details="global usage" if we have at start more than 1 link
                    if(selOption == 'init') {//
                        $('#hm_tplt_details').val('usg');
                    }
					$('#hm_tplt_select').trigger('change');
				}
				else {FW_okDialog('get ' +hminfo+ ' templateUsgG sortTemplate: receive undefined data!');}
			});
		}
	});
}

// set style for input options
function HMdeviceTools_updatePopupTpltRegOptions(id) {
	var match = id.match(/^hm_tplt_(.*)_(.*)$/);
	if(match != null) {
		var regname = match[2];
		var parCtr = tplt.par.size;
		var color = "red";
		for(var o = 0; o < 9; ++o) {
			var opt = document.getElementById("hm_tplt_regOptp" + o + "_" + regname);
			if(tplt.par.has("p" + o) && tplt.par.get("p" + o).clients.length == 0) { //single par
				color = "yellow";
			}
			else if(tplt.par.has("p" + o) && tplt.par.get("p" + o).clients.length > 0) { //multi par
				color = "orange";
			}
			else { //unbenutzte parIds
				color = "white";
			}
			opt.style.backgroundColor = color;
			opt.disabled = (o > parCtr);
		}
	}
}

function HMdeviceTools_updatePopupRegister(id) {
    var curInput = document.getElementById(id);
    if(curInput.getAttribute("orgvalue") != curInput.value) {
        $("#hm_reg_name_" + curInput.name).attr("class", "changed");
    }
    else {$("#hm_reg_name_" + curInput.name).removeAttr("class");}
	if($('#hm_tplt_select').val() == "expert") {
        HMdeviceTools_showApplyBtn();
    }
}

function HMdeviceTools_showApplyBtn() {
	//hide apply button if no values changed
	var showApply = false;
  var inputs = $('#hm_reg_table td:nth-child(3)').find(":input");
  for(var i = 0; i < inputs.length; ++i) {
    var inp = inputs[i];
		if(inp.value != inp.getAttribute("orgvalue")) {
			showApply = true;
			break;
		}
	}
	(showApply)? $('#hm_popup_btn_apply').show(): $('#hm_popup_btn_apply').hide();
}

// get the base url
function HMdeviceTools_getBaseUrl() {
  var url = window.location.href.split('?')[0];
  url += '?';
  if(csrf != null) {url += 'fwcsrf=' +csrf+ '&';}
  return url;
}
function HMdeviceTools_makeCommand(cmd) {
  return HMdeviceTools_getBaseUrl() + 'cmd=' +encodeURIComponent(cmd)+ '&XHR=1';
}

// buttons ########################################################################################
// create a popup with some buttons
function HMdeviceTools_openPopup(device,peer) {
  var body = document.querySelector("body");
  var overlay = document.createElement("div");
  body.appendChild(overlay);
  overlay.style["z-index"] = "100";
  overlay.setAttribute("class","ui-widget-overlay ui-front");
  overlay.setAttribute("id","hm_reg_overlay");
  var frame = document.createElement("div");
  body.appendChild(frame);
  frame.id = "hm_popup_frame";
  frame.style["position"] = "absolute";
  frame.style["width"] = "auto";
  frame.style["height"] = "80%";
  frame.style["left"] = "200px";
  frame.style["top"] = "100px";
  frame.style["z-index"] = "101";
  frame.setAttribute("class","ui-dialog ui-widget ui-widget-content ui-corner-all ui-front no-close ui-dialog-buttons ui-draggable ui-resizable");
  frame.setAttribute("id","hm_reg_popup");
  var content = document.createElement("div");
  frame.appendChild(content);
  content.setAttribute("class","ui-dialog-content ui-widget-content");
  content.setAttribute("id", device + peer + "hm_popup_content");
  content.style["height"] = "calc(100% - 80px)";
  content.style["max-height"] = "calc(100% - 80px)";
  content.style["min-width"] = "500px";
  var btnrow = document.createElement("div");
  frame.appendChild(btnrow);
  btnrow.setAttribute("class","ui-dialog-buttonpane ui-widget-content ui-helper-clearfix");
  var btnset = document.createElement("div");
  btnrow.appendChild(btnset);
  btnset.setAttribute("class","ui-dialog-buttonset");
  btnset.style.width = "100%";
  var table = document.createElement("table");
  btnset.appendChild(table);
  table.style.tableLayout = "auto";
  table.style.width = "100%";
  var row = document.createElement("tr");
  table.appendChild(row);
  var left = document.createElement("td");
  row.appendChild(left);
  left.align = 'left';
  var right = document.createElement("td");
  row.appendChild(right);
  right.align = "right";
  //useAll button
  var useAll = document.createElement("button");
  left.appendChild(useAll);
  useAll.id = "hm_popup_btn_useAll";
  useAll.style.display = "none";
  useAll.innerHTML = "<span class=\"ui-button-text\">Use All</span>";
  useAll.setAttribute('active','off');
  useAll.setAttribute("onclick","HMdeviceTools_btnAction('" +device+ "','" +peer+ "','useAll')");
  useAll.setAttribute("class","ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
  //useNone button
  var useNone = document.createElement("button");
  left.appendChild(useNone);
  useNone.id = "hm_popup_btn_useNone";
  useNone.style.display = "none";
  useNone.innerHTML = "<span class=\"ui-button-text\">Use None</span>";
  useNone.setAttribute('active','off');
  useNone.setAttribute("onclick","HMdeviceTools_btnAction('" +device+ "','" +peer+ "','useNone')");
  useNone.setAttribute("class","ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
  //allOn button
  var allOn = document.createElement("button");
  left.appendChild(allOn);
  allOn.id = "hm_popup_btn_allOn";
  allOn.style.display = "none";
  allOn.innerHTML = "<span class=\"ui-button-text\">All On</span>";
  allOn.setAttribute("onclick","HMdeviceTools_btnAction('" +device+ "','" +peer+ "','allOn')");
  allOn.setAttribute("class","ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
  //allOff button
  var allOff = document.createElement("button");
  left.appendChild(allOff);
  allOff.id = "hm_popup_btn_allOff";
  allOff.style.display = "none";
  allOff.innerHTML = "<span class=\"ui-button-text\">All Off</span>";
  allOff.setAttribute("onclick","HMdeviceTools_btnAction('" +device+ "','" +peer+ "','allOff')");
  allOff.setAttribute("class","ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
  //check button
  var check = document.createElement("button");
  left.appendChild(check);
  check.id = "hm_popup_btn_check";
  check.style.display = "none";
  check.innerHTML = "<span class=\"ui-button-text\">Check</span>";
  check.setAttribute("onclick","HMdeviceTools_btnAction('" +device+ "','" +peer+ "','check')");
  check.setAttribute("class","ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");


  //use button
  var use = document.createElement("button");
  right.appendChild(use);
  use.id = "hm_popup_btn_use";
  use.style.display = "none";
  use.innerHTML = "<span class=\"ui-button-text\">Use</span>";
  use.setAttribute('active','off');
  use.setAttribute('onclick',"HMdeviceTools_btnAction('" +device+ "','" +peer+ "','use')");
  use.setAttribute("class","ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
  //set button
  var set = document.createElement("button");
  right.appendChild(set);
  set.id = "hm_popup_btn_set";
  set.style.display = "none";
  set.innerHTML = "<span class=\"ui-button-text\">Set</span>";
  set.setAttribute('active','off');
  set.setAttribute("onclick","HMdeviceTools_btnAction('" +device+ "','" +peer+ "','set')");
  set.setAttribute("class","ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
  //unassign button
  var unassign = document.createElement("button");
  right.appendChild(unassign);
  unassign.id = "hm_popup_btn_unassign";
  unassign.style.display = "none";
  unassign.innerHTML = "<span class=\"ui-button-text\">Unassign</span>";
  unassign.setAttribute('active','off');
  unassign.setAttribute("onclick","HMdeviceTools_btnAction('" +device+ "','" +peer+ "','unassign')");
  unassign.setAttribute("class","ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
  //execute button
  var exe = document.createElement("button");
  right.appendChild(exe);
  exe.id = "hm_popup_btn_execute";
  exe.style.display = "none";
  exe.innerHTML = "<span class=\"ui-button-text\">Exec</span>";
  exe.setAttribute("onclick","HMdeviceTools_btnAction('" +device+ "','" +peer+ "','execute')");
  exe.setAttribute("class","ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
  //delete button
  var del = document.createElement("button");
  right.appendChild(del);
  del.id = "hm_popup_btn_delete";
  del.style.display = "none";
  del.innerHTML = "<span class=\"ui-button-text\">Delete</span>";
  del.setAttribute("onclick","HMdeviceTools_btnAction('" +device+ "','" +peer+ "','delete')");
  del.setAttribute("class","ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
  //show button
  var show = document.createElement("button");
  right.appendChild(show);
  show.id = "hm_popup_btn_show";
  show.style.display = "none";
  show.innerHTML = "<span class=\"ui-button-text\">Show</span>";
  show.setAttribute("onclick","HMdeviceTools_btnAction('" +device+ "','" +peer+ "','show')");
  show.setAttribute("class","ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
  //define button
  var define = document.createElement("button");
  right.appendChild(define);
  define.id = "hm_popup_btn_define";
  define.style.display = "none";
  define.innerHTML = "<span class=\"ui-button-text\">Define</span>";
  define.setAttribute("onclick","HMdeviceTools_btnAction('" +device+ "','" +peer+ "','define')");
  define.setAttribute("class","ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
  //apply button
  var apply = document.createElement("button");
  right.appendChild(apply);
  apply.id = "hm_popup_btn_apply";
  apply.style.display = "none";
  apply.innerHTML = "<span class=\"ui-button-text\">Apply</span>";
  apply.setAttribute("onclick", "HMdeviceTools_applyPopup('"+device+"','"+peer+"')");
  apply.setAttribute("class", "ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
  //save button
  var save = document.createElement("button");
  right.appendChild(save);
  save.id = "hm_popup_btn_save";
  save.style.display = "none";
  save.innerHTML = "<span class=\"ui-button-text\">Save</span>";
  save.setAttribute("onclick","HMdeviceTools_btnAction('" +device+ "','" +peer+ "','save')");
  save.setAttribute("class","ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
  //edit button
  var edit = document.createElement("button");
  right.appendChild(edit);
  edit.id = "hm_popup_btn_edit";
  edit.style.display = "none";
  edit.innerHTML = "<span class=\"ui-button-text\">Edit</span>";
  edit.setAttribute("onclick","HMdeviceTools_btnAction('" +device+ "','" +peer+ "','edit')");
  edit.setAttribute("class","ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
  //cancel button
  var cancel = document.createElement("button");
  right.appendChild(cancel);
  cancel.id = "hm_popup_btn_cancel";
  cancel.innerHTML = "<span class=\"ui-button-text\">Cancel</span>";
  cancel.setAttribute("onclick", "HMdeviceTools_cancelPopup(true)");
  cancel.setAttribute("class", "ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
  return content;
}

// check hminfo
function HMdeviceTools_checkHMinfo() {
  var cmd = 'list TYPE=HMinfo i:NAME';
  if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
  var url = HMdeviceTools_makeCommand(cmd);
  $.get(url,function(data) {
    var toolsbar = document.getElementById('HMdeviceTools_toolsTable');
    var match = data.match(/^(\w+)/);
    if(match != null) {
      var hminfo = match[1];
      toolsbar.setAttribute('hminfo',hminfo);
    }
    else {
      toolsbar.setAttribute('hminfo','');
      FW_okDialog('no hminfo device found!<br><br>define it first to get full functionality.');
    }
  });
}
// check if template data is complete
function HMdeviceTools_templateCheck() {
    var alertMsg = 'define check find error(s): <br><br>';
    if(tplt.name == '') {alertMsg += '- missing name of the template<br>';}
    if(tplt.name.match(/[<>]+/)) {alertMsg += '- template name includes forbidden characters (<,>)<br>';}
    if(tplt.par.size > 0) {
        var ids = Array.from(tplt.par.keys()).sort();
        for(var i = 0; i < ids.length; ++i) {
            if(tplt.par.get(ids[i]).name == '') {alertMsg += '- missing name of parameter p' +i+ '<br>';}
            if(i == 0 && ids[i] != 'p' + i) {alertMsg += '- first parameter id is not p0<br>';}
            if(i == ids.length-1 && ids[i] != 'p' + i) {alertMsg += '- last parameter id is not p' +i+ '<br>';}
        }
    }
    if(tplt.info == '') {alertMsg += '- missing info text of the template<br>';}
    if(tplt.reg.size == 0) {alertMsg += '- missing at least one register<br>';}
    if(alertMsg != 'define check find error(s): <br><br>') {
        FW_okDialog(alertMsg);
        return false;
    }
    else {return true;}
}

function HMdeviceTools_btnAction(device,peer,btn) {
    var hminfo = document.getElementById('HMdeviceTools_toolsTable').getAttribute('hminfo');
    var idx = (peer == '')? 0: peer;
    var realIdx = idx;
    if(idx != 0 && idx.match(/^self\d\d$/) == null) {
        var suffix = document.getElementById('hm_dev_use_' +device+ ':' + idx).getAttribute('peersuffix');
        realIdx += suffix;
    }

    if(     btn == 'define' || btn == 'show') {    // define or show new template ###########################################
        if(HMdeviceTools_templateCheck()) { //if template check is clean
            var cmd = HMdeviceTools_makeCmdDefineTemplate();
            if(btn == 'show') { //show command on template define output
                var output = document.getElementById('hm_tplt_define');
                output.value = cmd;
                output.focus();
                output.select();
            }
            else if(btn == 'define') { //define template
                var cmd2 = '{';
                cmd2 += 'foreach my $e (devspec2array("TYPE=CUL_HM:FILTER=model!=(ACTIONDETECTOR|CCU-FHEM|VIRTUAL)")){';
                cmd2 +=   'CUL_HM_TmplSetCmd($e);;';
                cmd2 += '}';
                cmd2 += '}';

                cmd += ';' + cmd2;
                if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
                var url = HMdeviceTools_makeCommand(cmd);
                $.get(url, function(data){
                    if(data != '\n') {FW_okDialog(data);}
                    else {HMdeviceTools_updateTemplateList(device,peer,(tplt.type == '')? tplt.name: tplt.name +'_'+ tplt.type);}
                });
            }
        }
    }
    else if(btn == 'use') {                        // use selected templates and/or set parameter values ####################
        var currentDeviceAction = '';
        $("[id^='hm_dev_name_'][class~='changed']").each(function() {
            var link = this.id.replace(/^hm_dev_name_/,'');
            var devName = link.split(':')[0];
            var peerName = link.split(':')[1];
            var inpCheck = document.getElementById(this.id.replace(/_name_/,'_use_'));
            if(inpCheck.checked == true) { //assign
                if(devName == device && peerName == idx) {currentDeviceAction = 'set';}
                else {HMdeviceTools_makeSetTemplate(devName,peerName);}
            }
            else if(inpCheck.checked == false) { //unassign
                if(devName == device && peerName == idx) {currentDeviceAction = 'unassign';}
                else {HMdeviceTools_makeUnassignTemplate(devName,peerName);}
            }
        });
        if(currentDeviceAction == 'set') {HMdeviceTools_btnAction(device,peer,'set');}
        else if(currentDeviceAction == 'unassign') {HMdeviceTools_btnAction(device,peer,'unassign');}
        else {HMdeviceTools_updateTemplateList(device,peer,(tplt.type == '')? tplt.name: tplt.name +'_'+ tplt.type);}
    }
    else if(btn == 'set') {                        // assign template and/or set pars #######################################
        HMdeviceTools_makeSetTemplate(device,idx);
        //close popup if we have to change any reg
        var closePopup = false;
        var regs = Array.from(tplt.reg.keys()).sort();
        for(var r = 0; r < regs.length; ++r) {
            var regName = regs[r];
            var orgValue = document.getElementById('hm_reg_val_' + regName).getAttribute('orgvalue');
            var tpltValue = tplt.reg.get(regName).value;
            var parId = tplt.reg.get(regName).parId;
            if(parId != '') { //use par
                var inpPar = document.getElementById('hm_tplt_' +parId+ '_value');
                orgValue = inpPar.getAttribute('orgvalue');
                tpltValue = inpPar.value;
            }
            if(tpltValue != orgValue) {
                closePopup = true;
                break;
            }
        }
        if(closePopup) {HMdeviceTools_cancelPopup(false);}
        else {HMdeviceTools_updateTemplateList(device,peer,(tplt.type == '')? tplt.name: tplt.name +'_'+ tplt.type);}
    }
    else if(btn == 'unassign') {                   // unassign template #####################################################
        HMdeviceTools_makeUnassignTemplate(device,idx);
        HMdeviceTools_updateTemplateList(device,peer,(tplt.type == '')? tplt.name: tplt.name +'_'+ tplt.type);
    }
    else if(btn == 'delete') {                     // delete template #######################################################
        var cmd = 'set ' + hminfo + ' templateDef ' + tplt.name + ' del';
        if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
        var url = HMdeviceTools_makeCommand(cmd);
        $.get(url, function(data){
            if(data) {FW_okDialog(data);}
            else {HMdeviceTools_updateTemplateList(device,peer,'init');}
        });
    }
    else if(btn == 'useAll' || btn == 'useNone') { // turn on/off all uses ##################################################
        HMdeviceTools_turnOnOffAllUses((btn == 'useAll')? true: false);
    }
    else if(btn == 'allOn'  || btn == 'allOff') {  // turn on/off all regs ##################################################
        HMdeviceTools_turnOnOffAllRegs((btn == 'allOn')? 'on': 'off');
    }
    else if(btn == 'save') {                       // save current template #################################################
        if(HMdeviceTools_templateCheck()) { //if template check is clean
            var newDef = HMdeviceTools_makeCmdDefineTemplate();
            var oldDef = $('#hm_tplt_define').attr('orgvalue');
            if(newDef != oldDef) {
                var oldName = $('#hm_tplt_name').attr('orgvalue');
                var oldType = $('#hm_tplt_generic').attr('orgvalue');
                var oldTpltIsGeneric = (oldType.match(/^(?:long|short)$/) != null)? true: false;
                var newName = tplt.name;
                var newType = tplt.type;
                var newTpltIsGeneric = (newType.match(/^(?:long|short)$/) != null)? true: false;
                var isGenericChange = (oldTpltIsGeneric != newTpltIsGeneric)? true: false;
                var cmd = '';
                var next = ';\n';
                var isTemplateAssigned = (tplt.ass.length > 0)? true: false;

                if(isTemplateAssigned) {
                    tplt.ass.forEach((item) => {
                        //item: assignment of template => entity,(0|peer:[both|long|short])
                        var usg = item.split(',');
                        //templateDel <entity> <template> <0|peer:[both|long|short]>
                        cmd += 'set ' +hminfo+ ' templateDel ' +usg[0]+ ' ' +oldName+ ' ' +usg[1]+ next;
                    });
                }
                cmd += 'set ' +hminfo+ ' templateDef ' +oldName+ ' del' +next;
                cmd += newDef +next;
                
                //check if old assignments are possible for new template
                var cmd2 = '{';
                if(isTemplateAssigned) {
                    cmd2 += 'my @arr;;';
                }
                cmd2 += 'foreach my $e (devspec2array("TYPE=CUL_HM:FILTER=model!=(ACTIONDETECTOR|CCU-FHEM|VIRTUAL)")){';
                cmd2 +=   'CUL_HM_TmplSetCmd($e);;';
                if(isTemplateAssigned) {
                    cmd2 +=   'if($defs{$e}{helper}{cmds}{lst}{tplChan} =~ m/(^|,)' +newName+ '(,|$)/){';
                    cmd2 +=     'push(@arr,$e.":0");;';
                    cmd2 +=   '} ';
                    cmd2 +=   'elsif($defs{$e}{helper}{cmds}{lst}{tplPeer} =~ m/(^|,)' +((newType == '')? newName: newName +'_'+ newType)+ '(,|$)/){';
                    cmd2 +=     'push(@arr,$e.":".$_) foreach(sort(CUL_HM_getPeers($e,"Names")));;';
                    cmd2 +=   '}';
                }
                cmd2 += '}';
                if(isTemplateAssigned) {
                    cmd2 += 'return join(",",@arr);;';
                }
                cmd2 += '}';

                cmd += cmd2;
                if(HMdeviceTools_debug) {log('HMdeviceTools: \n' +cmd);}
                cmd = cmd.replace(/\n/g,'');
                var url = HMdeviceTools_makeCommand(cmd);
                $.get(url,function(data1){
                    var msg = '';
                    if(data1) {
                        if(isTemplateAssigned) {
                            var newLinks = data1.trim().split(',');//newline at the end!!!
                            var noAss = [];
                            var cmd = '';
                            tplt.ass.forEach((item,index,array) => {
                                //item: assignment of template => entity,(0|peer:[both|long|short])
                                var usg = item.split(',');
                                var idx = usg[1].split(':');
                                if(newLinks.includes(usg[0] +':'+ idx[0]) && !isGenericChange) {
                                    //set <entity> tplSet_<0|peer> <template>[_<long|short>]
                                    cmd += 'set ' +usg[0]+ ' tplSet_' +idx[0]+ ' ' +newName+ ((idx[1] == undefined || idx[1] == 'both')? '': '_' + idx[1]);
                                    if(index < array.length -1) {cmd += next;}
                                }
                                else {noAss.push(usg[0] +':'+ idx[0]);}
                            });
                            if(noAss.length > 0) {msg = 'WARNING!<br>lost assignments due to template changes:<br> => ' + noAss.join('<br> => ');}
                            if(cmd != '') { //assignments for new template
                                if(HMdeviceTools_debug) {log('HMdeviceTools: \n' +cmd);}
                                cmd = cmd.replace(/\n/g,'');
                                var url = HMdeviceTools_makeCommand(cmd);
                                $.get(url,function(data2){
                                    if(data2) {FW_okDialog('error:<br><br>' + data2,0,function(){HMdeviceTools_cancelPopup(true);});}   //error with assignements
                                    else {
                                        FW_okDialog('saved changes!<br><br>' + msg,0,function(){                                        //new template with old assignements
                                            HMdeviceTools_leaveEditMode();
                                            HMdeviceTools_updateTemplateList(device,peer,(newType == '')? newName: newName +'_'+ newType);
                                        });
                                    }
                                });
                            }
                            else {
                                FW_okDialog('saved changes!<br><br>' + msg,0,function(){                                                //no old assignements
                                    HMdeviceTools_leaveEditMode();
                                    HMdeviceTools_updateTemplateList(device,peer,(newType == '')? newName: newName +'_'+ newType);
                                });
                            }
                        }
                        else if(data1 == '\n') { //'\n' from perlcode?                                                                  //old template with no assignements
                            FW_okDialog('saved changes!',0,function(){
                                HMdeviceTools_leaveEditMode();
                                HMdeviceTools_updateTemplateList(device,peer,(newType == '')? newName: newName +'_'+ newType);
                            });
                        }
                        else {FW_okDialog('error:<br><br>' + data1,0,function(){HMdeviceTools_cancelPopup(true);});}                    //error
                    }
                    else {
                        FW_okDialog('saved changes!<br><br>' + 'what is the reason???',0,function(){                                    //???
                            HMdeviceTools_leaveEditMode();
                            HMdeviceTools_updateTemplateList(device,peer,(newType == '')? newName: newName +'_'+ newType);
                        });
                    }
                });
            }
            else {
                FW_okDialog('nothing to do!',0,function(){
                    HMdeviceTools_leaveEditMode();
                    HMdeviceTools_updateTemplateList(device,peer,(tplt.type == '')? tplt.name: tplt.name +'_'+ tplt.type);
                });
            }
        }
    }
    else if(btn == 'edit') {                       // edit current template #################################################
        HMdeviceTools_enterEditMode();
    }
    else if(btn == 'check') {                      // check all templates ###################################################
        //templateChk [filter] <template> <peer:[long|short]> [<param1> ...]        
        var cmd = 'get ' +hminfo+ ' templateChk -f ^' +device+ '$ ' +tplt.name+ ' ';
        cmd += ((type == '')? realIdx: realIdx +':'+ type);
        if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
        var url = HMdeviceTools_makeCommand(cmd);
        $.get(url, function(data){
            if(data) {FW_okDialog(data);}
            else {
                $('#hm_popup_btn_execute').show();
                //HMdeviceTools_updateTemplateList(device,peer,(tplt.type == '')? tplt.name: tplt.name +'_'+ tplt.type);
            }
        });
    }
    else if(btn == 'execute') {                    // execute all templates #################################################
        //templateExe <template>
        var cmd = 'set ' +hminfo+ ' templateExe ' + ((tplt.type == '')? tplt.name: tplt.name +'_'+ tplt.type);
        if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
        var url = HMdeviceTools_makeCommand(cmd);
        $.get(url, function(data){
            if(data) {FW_okDialog('error:<br><br>' + data,0,function(){HMdeviceTools_cancelPopup(true);});}
            else {HMdeviceTools_cancelPopup(true);}
        });
    }
}

function HMdeviceTools_makeCmdDefineTemplate() {
    //set hminfo templateDef name par1:par2 ... "info" reg1:val1 reg2:val2 ...
    var mode = $('#hm_tplt_select').val();
    if(mode != 'expert' && mode != 'new') {mode = 'select';}
    if(mode == 'select' && $('#hm_tplt_name').is(':visible')) {mode = 'edit';}
    var hminfo = document.getElementById('HMdeviceTools_toolsTable').getAttribute('hminfo');
    var tpltName = tplt.name;
    var cmd = 'set ' +hminfo+ ' templateDef ' + tpltName;
    if(tplt.par.size) {
        for(var p = 0; p < tplt.par.size; ++p) {
            var parName = tplt.par.get('p' + p).name;
            if(p > 0) {cmd += ':' + parName;} //add parameter #2...last
            else {cmd += ' ' + parName;}      //add parameter #1
        }
    }
    else {cmd += ' 0';}                       //if no parameter
    cmd += ' "' + tplt.info + '"';            //add info
    var regs = Array.from(tplt.reg.keys()).sort();
    for(var r = 0; r < regs.length; ++r) {
        var regName = regs[r];
        var regObj = tplt.reg.get(regName);
        var val = regObj.parId;
        if(val == '') {
            if(mode == 'new' || mode == 'edit') {
                val = document.getElementById('hm_reg_val_' + regName).value; //value from input!
                regObj.value = val;
                tplt.reg.set(regName,regObj);
            }
            else {val = regObj.value;}
        }
        if(tplt.type == 'short') {regName = regName.replace(/^sh/,'');}
        else if(tplt.type == 'long') {regName = regName.replace(/^lg/,'');}
        cmd += ' ' + regName + ':' + val;     //add register
    }
    return cmd;
}
function HMdeviceTools_makeSetTemplate(device,idx) {
    var curDevice = document.getElementById('hm_tplt_select').getAttribute('device');
    var curPeer = document.getElementById('hm_tplt_select').getAttribute('peer');
    var valuesAreTrue = true;
    var parValues = [];
    for(var v = 0; v < tplt.par.size; ++v) {
        var parValue = document.getElementById('hm_dev_v' +v+ '_' +device+ ':' + idx).value;
        parValues.push(parValue);
        if(parValue == '') {valuesAreTrue = false;}
    }
    var cmd = '';
    if(valuesAreTrue) {
        var hminfo = document.getElementById('HMdeviceTools_toolsTable').getAttribute('hminfo');
        //templateSet <entity> <template> <[0|peer:[both|long|short]]> [<param1> ...]
        cmd = 'set ' +hminfo+ ' templateSet ' +device+ ' ' + tplt.name;
        var type = (idx != 0 && tplt.type == '')? 'both': tplt.type;
        cmd += ' ' + ((type == '')? idx: idx +':'+ type);
        for(var v = 0; v < tplt.par.size; ++v) {cmd += ' ' + parValues[v];}
    }
    else {cmd = 'set ' +device+ ' tplSet_' +idx+ ' ' +tplt.name+ ((tplt.type == '')? '': '_' + tplt.type);}
    if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
    var url = HMdeviceTools_makeCommand(cmd);
    $.get(url, function(data){
        if(data) {FW_okDialog(data);}
    });
}
function HMdeviceTools_makeUnassignTemplate(device,idx) {
    //var hminfo = document.getElementById('HMdeviceTools_toolsTable').getAttribute('hminfo');
    //set hm templateDel <entity> <template>
    //var cmd = 'set ' + hminfo + ' templateDel ' + device + ' ' + name; // => no function!!
    var realIdx = idx;
    if(idx != 0 && idx.match(/^self\d\d$/) == null) {
        var suffix = document.getElementById('hm_dev_use_' +device+ ':' + idx).getAttribute('peersuffix');
//      realIdx += suffix;
    }
    var type = (idx != 0 && tplt.type == '')? 'both': tplt.type;
    var cmd = 'set ' +device+ ' tplDel ' +((type == '')? idx: realIdx +':'+ type)+ '>' + tplt.name;
    if(HMdeviceTools_debug) {log('HMdeviceTools: ' + cmd);}
    var url = HMdeviceTools_makeCommand(cmd);
    $.get(url, function(data){
        if(data) {FW_okDialog(data);}
    });
}
//turn on or off all uses
function HMdeviceTools_turnOnOffAllUses(opt) {
    $("[id^='hm_dev_use_'][checked!='" +opt+ "']").each(function() {
        this.checked = opt;
        var idStr = this.id.replace(/\./g,'\\.');
        idStr = idStr.replace(/:/g,'\\:');
        $('#' + idStr).trigger('change');
    });
}
//turn on or off all regs
function HMdeviceTools_turnOnOffAllRegs(opt) {
  $("[id^='hm_tplt_reg_'][value!='" +opt+ "']:visible").each(function() {
    this.value = opt;
    $('#' + this.id).trigger('change');
  });
}
// check for changed values and send to device
function HMdeviceTools_applyPopup(device,peer) {
  var command = '';
  var inputs = $('#hm_reg_table td:nth-child(3)').find(':input');
  for(var i = 0; i < inputs.length; ++i) {
    var inp = inputs[i];
    if(inp.getAttribute('orgvalue') != inp.value) {
      var cmdmode = (command == '')? 'exec': 'prep';
      var cmd = 'set ' +device+ ' regSet ' +cmdmode+ ' ' +inp.name+ ' ' + inp.value;
      if(peer != '') {cmd += ' ' + peer;}
      command = cmd + '; ' + command;
    }
  }
  var url = HMdeviceTools_makeCommand(command);
  if(command != '') {
    if(HMdeviceTools_debug) {log('HMdeviceTools: ' + command);}
    $.get(url, function(data){
        if(data) {FW_okDialog(data);}
        else {HMdeviceTools_cancelPopup(true);}
    });
  }
  else {FW_okDialog('No register changes, nothing to do');}
}
// close popup
function HMdeviceTools_cancelPopup(reload) {
    if(reload) {location.reload();}
    else {
        $('#hm_reg_popup').remove();
        $('#hm_reg_overlay').remove();
    }
}

