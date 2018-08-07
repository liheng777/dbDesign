/**
 *
 */

// 画面项目初始化
var myUm = null;

var tblidx_grid_cols = [[
    { field:'idxName',title:'索引名称',width:250,editor:'text' },
    { field:'idxCol', title:'栏位', width:350,
        editor : {
            "type" : "combobox",
            "options" : {
                "valueField" : "text",
                "textField" : "name",
                "required" : true,
                limitToList: true,
                multiple: true,
                panelHeight: 250
            }
        }
    },
    { field:'idxType', title:'索引类型', width:100,
        formatter: function(value, row, index) {
            if (value) {
                return $translate('index_type_val_' + value);
            }
            return '';
        },
        editor : {
            "type" : "combobox",
            "options" : {
                "valueField" : "text",
                "textField" : "name",
                "data" : [
                    {text:'0',name:''},
                    {text:'1',name:'Normal'},
                    {text:'2',name:'Unique'},
                    {text:'3',name:'Full Text'}
                ],
                "required" : true,
                limitToList: true,
                panelHeight: 120,
                editable: false
            }
        }
    },
    { field:'idxMethod', title:'索引方法', width:90,
        formatter: function(value, row, index) {
            if (value) {
                return $translate('index_method_val_' + value);
            }
            return '';
        },
        editor : {
            "type" : "combobox",
            "options" : {
                "valueField" : "text",
                "textField" : "name",
                "data" : [
                    {text:'0',name:''},
                    {text:'1',name:'BTREE'},
                    {text:'2',name:'HASH'}
                ],
                "required" : true,
                limitToList: true,
                panelHeight: 100,
                editable: false
            }
        }
    },
    { field:'remarks',title:'备注',width:380,editor:'textbox' },
]];

$(function () {
    var curDbId = $.trim($('#dbId').val()); // 异常情况下，这里使用了dbId作为error code
    if (curDbId == 0 || curDbId == 1) {
        $.messager.alert({
            iconCls: 'icon-no',
            title: '数据错误',
            closable: false,
            ok: '返回',
            msg: '所选择的数据库不存在，请联系系统管理员。<br/>再见!',
            fn: function(){
                window.location.href = Ap_servletContext + '/home?type=1';
            }
        });
        return;
    } else if (curDbId == 2 || curDbId == 3) {
        $.messager.alert({
            iconCls: 'icon-no',
            title: '权限错误',
            closable: false,
            ok: '返回',
            msg: '没有权限访问选择的数据库，请联系系统管理员。<br/>再见!',
            fn: function(){
                window.location.href = Ap_servletContext + '/home?type=1';
            }
        });
        return;
    }

    $('#main_page').append("<script type=\"text/plain\" id=\"myEditor\" style=\"width:1000px;height:590px;\"></script>");
    myUm = UM.getEditor('myEditor', {
        /* 传入配置参数,可配参数列表看umeditor.config.js */
        toolbar: ['source | undo redo | bold italic underline strikethrough | superscript subscript | forecolor backcolor | removeformat |',
            'insertorderedlist insertunorderedlist | selectall cleardoc paragraph | fontfamily fontsize' ,
            '| justifyleft justifycenter justifyright justifyjustify |',
            '| horizontal preview']
    });
    myUm.setDisabled();

    // 设置当前编辑的数据库名
    $('#cc').panel({title: $('#dbn').val()});

    var favDb = $.trim($('#favDb').val());
    if (favDb == '' || favDb == '0' || favDb != $.trim($('#dbId').val())) {
        var item = $('#db-tools_menu').menu('findItem', 'setdbenv');
        if (item) {
            $('#db-tools_menu').menu('enableItem', item.target);
        }
        item = $('#db-tools_menu').menu('findItem', 'unsetdbenv');
        if (item) {
            $('#db-tools_menu').menu('disableItem', item.target);
        }
    } else {
        var item = $('#db-tools_menu').menu('findItem', 'setdbenv');
        if (item) {
            $('#db-tools_menu').menu('enableItem', item.target);
        }
        item = $('#db-tools_menu').menu('findItem', 'unsetdbenv');
        if (item) {
            $('#db-tools_menu').menu('enableItem', item.target);
        }
    }

    // 创建搜索框
    $('#tbl_searchbox').textbox({
        prompt: 'Please Input Value',
        iconCls: 'icon-search',
        iconAlign: 'left',
        fit: true
    });
    $('#tbl_searchbox').textbox('textbox').bind({
        keyup: function (e) {
            doSearch($(this).val(), 0);
            $('#tblList').datalist('unselectAll');
        }
    });

    $('#tbl-tabs').tabs({
        onSelect: function(title, index) {
            _curTblId = null;
            if (index == 0) {
                _curTblId = 0;
                $('#tblList').datalist("unselectAll");
                return;
            }
            var pp = $('#tbl-tabs').tabs('getTab', index); // tab页切换时要记住当前页id
            var tabId = pp.panel('options').id;
            if (tabId) {
                _curTblId = tabId;
            }
            // 要同步高亮tblList列表
            var rowIdx = $('#tblList').datalist("getRowIndex", tabId);
            if (rowIdx >= 0) {
                // 有可能指定的表不在一览中（比如检索时）
                $('#tblList').datalist("selectRecord", tabId);
            } else {
                $('#tblList').datalist('unselectAll');
            }
        },
        onBeforeClose: function(title, index) {
            if (index == 0) {
                // 主页
                return true;
            }
            if (editableMap[_curTblId] == undefined || editableMap[_curTblId] === false) {
                return true;
            }
            var target = this;
            // 要判断是否有未保存的编辑，如果有，让用户确认是否要关闭该tab
            $.messager.confirm('Confirm', 'Are you sure you want to close ' + title, function(r) {
                if (r) {
                    var opts = $(target).tabs('options');
                    var bc = opts.onBeforeClose;
                    opts.onBeforeClose = function(){};  // allowed to close now
                    $(target).tabs('close', index);
                    opts.onBeforeClose = bc;  // restore the event function
                }
            });
            return false;	// prevent from closing
        }
    });

    $.extend($.fn.datagrid.defaults.editors, {
        textarea: {
            init: function (container, options) {
                var input = $('<textarea >').appendTo(container);
                return input;
            },
            destroy: function (target) {
                $(target).remove();
            },
            getValue: function (target) {
                return $(target).val();
            },
            setValue: function (target, value) {
                $(target).val(value);
                // 编辑时，加载内容后，重新设置textarea高度
                $(target).each(function () {
                    this.setAttribute('style', 'height:' + (this.scrollHeight) + 'px;width:100%;overflow-y:hidden;');
                });
            },
            resize: function (target, width) {
                $(target)._outerWidth(width);
            }
        }
    });
    $.extend($.fn.datagrid.methods, {
        editCell: function(jq,param){
            return jq.each(function(){
                var opts = $(this).datagrid('options');
                var fields = $(this).datagrid('getColumnFields',true).concat($(this).datagrid('getColumnFields'));
                for(var i=0; i<fields.length; i++){
                    var col = $(this).datagrid('getColumnOption', fields[i]);
                    col.editor1 = col.editor;
                    if (fields[i] != param.field){
                        col.editor = null;
                    }
                }
                $(this).datagrid('beginEdit', param.index);
                for(var i=0; i<fields.length; i++){
                    var col = $(this).datagrid('getColumnOption', fields[i]);
                    col.editor = col.editor1;
                }
            });
        }
    });

    $('#tblList').datalist({
        url: Ap_servletContext + '/ajax/getTableList?dbId=' + $('#dbId').val() + '&targetType=' + $('#targetType').val() + '&_t=' + new Date().getTime(),
        border: false,
        lines: true,
        fit: true,
        striped: true,
        method: 'get',
        valueField: '_id',
        textField: 'tableName',
        idField: '_id',
        loadMsg: '',
        onClickRow: function (index, row) {
            var tblId = row._id;
            if (tblId) {
                _curTblId = tblId;
                // 先查看是否已存在，若已存在则切换tab
                if ($('#tbl-tabs').tabs('exists', row.tableName)) {
                    $('#tbl-tabs').tabs('select', row.tableName); // 这里不刷新数据，编辑时再确认是否有修改
                    return;
                }

                _openNewTab(tblId);
            } else {
                $.messager.alert('发生错误', '可能是数据加载错误．', 'error');
            }
        },
        onLoadSuccess: function(data) {
            var oldHeight = $('#dd').css('height');
            oldHeight = oldHeight.replace(/px/, "");
            oldHeight = oldHeight - 27;
            $('#dd').css('height', oldHeight + 'px'); // 这里要重置region的高度，不知道是用法不对还是easyui的问题，只在第一次打开画面时有问题，浏览器尺寸变化时高度正常
        }
    });

    $('body').on('click', 'span.tree-hit.tree-expanded', function() {
        endEditing();
        var rowObj = $(this);
        rowObj.addClass('tree-collapsed');
        rowObj.removeClass('tree-expanded');
        rowObj.removeClass('tree-expanded-hover');
        // 展开/收缩当前节点
        var rowIdx = rowObj.data('id');
        var itemVal = rowObj.data('value');
        var prex = itemVal.lastIndexOf(" ");

        var trColArr = rowObj.closest('div.datagrid div.datagrid-view').find('div.datagrid-view1 div.datagrid-body div.datagrid-body-inner table.datagrid-btable tbody tr');
        var trDataArr = rowObj.closest('div.datagrid div.datagrid-view').find('div.datagrid-view2 div.datagrid-body table.datagrid-btable tbody tr');

        var allDatas = $('#col_grid_' + _curTblId).datagrid('getRows');
        var inSameLvl = false;
        allDatas.forEach(function(item, index, array) {
            if (index <= rowIdx || inSameLvl) {
                return;
            }
            // 比较是否在同一层
            if (prex >= item.columnName.lastIndexOf(" ")) {
                inSameLvl = true;
                return;
            }
            $(trColArr[index]).hide();
            $(trDataArr[index]).hide();
        });
    });
    $('body').on('mouseenter', 'span.tree-hit.tree-expanded', function() {
        $(this).addClass('tree-expanded-hover');
    });
    $('body').on('mouseleave', 'span.tree-hit.tree-expanded', function() {
        $(this).removeClass('tree-expanded-hover');
    });
    $('body').on('click', 'span.tree-hit.tree-collapsed', function() {
        endEditing();
        var rowObj = $(this);
        rowObj.addClass('tree-expanded');
        rowObj.removeClass('tree-collapsed');
        rowObj.removeClass('tree-collapsed-hover')
        // 展开/收缩当前节点
        var rowIdx = rowObj.data('id');
        var itemVal = rowObj.data('value');
        var prex = itemVal.lastIndexOf(" ");

        var trColArr = rowObj.closest('div.datagrid div.datagrid-view').find('div.datagrid-view1 div.datagrid-body div.datagrid-body-inner table.datagrid-btable tbody tr');
        var trDataArr = rowObj.closest('div.datagrid div.datagrid-view').find('div.datagrid-view2 div.datagrid-body table.datagrid-btable tbody tr');

        var allDatas = $('#col_grid_' + _curTblId).datagrid('getRows');
        var inSameLvl = false;
        allDatas.forEach(function(item, index, array) {
            if (index <= rowIdx || inSameLvl) {
                return;
            }
            // 比较是否在同一层
            if (prex >= item.columnName.lastIndexOf(" ")) {
                inSameLvl = true;
                return;
            }
            $(trColArr[index]).show();
            $(trDataArr[index]).show();
            var exp = $(trDataArr[index]).find('span.tree-hit');
            if (exp) {
                exp.addClass('tree-expanded');
                exp.removeClass('tree-collapsed');
            }
        });
    });
    $('body').on('mouseenter', 'span.tree-hit.tree-collapsed', function() {
        $(this).addClass('tree-collapsed-hover');
    });
    $('body').on('mouseleave', 'span.tree-hit.tree-collapsed', function() {
        $(this).removeClass('tree-collapsed-hover')
    });

    // easyui的textbox未提供onclick事件，只能采用下面方法解决
    $('body').on('click', 'input._tbl_desc + span :first-child', unselectGridItem);
});

function _openNewTab(tblId) {
    var loadLy = layer.load(1);
    // 查询表定义信息，动态加载列定义
    $.ajax({
        type: 'get',
        url: Ap_servletContext + '/ajax/getTable?tblId=' + tblId + '&_t=' + new Date().getTime(),
        success: function (data) {
            layer.close(loadLy);
            if (data.code == 0 && data.data) {
                _createTblHeadDiv(tblId, data.data.tblName, data.data.tblNameCn, data.data.tblDesc, data.data.lastUpd);
                _createTblGrid(tblId, data.data.columns);
            } else {
                layer.msg(data.msg + ' (code=' + data.code + ")");
            }
        }
    });
}

// 弹出菜单，目前只有两个
function popmenu(e, menuKey) {
    $('#' + menuKey).menu('show', {
        left: e.pageX,
        top: e.pageY
    });
}

// 根据名称查询表一览
function doSearch(value, freshFlg) {
    if (freshFlg == 1) {
        $('#tbl_searchbox').searchbox('clear');
    }
    $('#tblList').datalist('load', {
        dbId: $('#dbId').val(),
        tblName: value,
        targetType: $('#targetType').val()
    });
}

// 切换表／视图
function convertType(value) {
    $('#targetType').val(value);
    // 然后重新加载 table_list


}

// 创建表头说明
function _createTblHeadDiv(tblId, tblName, tblNameCn, tblDesc, lastUpd) {
    var isCreated = false;
    if (tblName == '' || tblName == null || tblName == undefined) {
        isCreated = true;
        tblName = '新建表';
    }
    // 先动态创建tab
    $('#tbl-tabs').tabs('add', {
        id: tblId,  // tab页的id默认是当前表的id(从数据库而来的)
        title: tblName,
        content: '<div id="tabDiv_' + tblId + '" class="easyui-layout" fit="true"></div>',
        closable: true
    });

    // 动态创建layout
    $('#tabDiv_' + tblId).layout();
    $('#tabDiv_' + tblId).layout('add',{
        region: 'north',
        border: false,
        content: $($('#tb_info').html())
    });
    $('#tabDiv_' + tblId).layout('add',{
        region: 'center',
        border: false,
        content: '<table id="col_grid_' + tblId + '"></table>'
    });

    // 只读权限的用户不显示操作按钮
    _displayEditToolbar(false);

    // 然后加载操作按钮
    var prefixId = "#" + tblId;
    $(prefixId + ' a._linkbtn_add').linkbutton({
        iconCls: 'icon-add'
    });
    $(prefixId + ' a._linkbtn_edit').linkbutton({
        iconCls: 'icon-edit'
    });
    $(prefixId + ' a._linkbtn_remove').linkbutton({
        iconCls: 'icon-remove'
    });
    $(prefixId + ' a._linkbtn_save').linkbutton({
        iconCls: 'icon-save'
    });

    // 设置表名等初始值
    if (isCreated) {
        $(prefixId + ' input._tbl_name').textbox();
        $(prefixId + ' input._tbl_name_cn').textbox();
        $(prefixId + ' input._tbl_desc').textbox({ multiline: true });
    } else {
        $(prefixId + ' input._tbl_name').textbox({value: tblName, 'readonly': true});
        $(prefixId + ' input._tbl_name_cn').textbox({value: tblNameCn, 'readonly': true});
        $(prefixId + ' input._tbl_desc').textbox({value: tblDesc, multiline: true, 'readonly': true});
        $(prefixId + ' input._tbl_name_p').val(tblName);
        $(prefixId + ' input._tbl_name_cn_p').val(tblNameCn);
        $(prefixId + ' input._tbl_desc_p').val(tblDesc);
    }
    // $("input", $(prefixId + ' input._tbl_desc').next("span textarea")).click(function() {
    //     alert("ok"); //unselectGridItem
    // });


    $(prefixId + ' input._tbl_last_updtime').val(lastUpd);
}

// 创建表的定义一览
function _createTblGrid(tblId, colHeader) {
    var colDef = {};
    // 在这里添加列定义的formatter，styler，editor（目前只有这3个）
    // 这里还没有更好的办法直接定位到需要添加属性的所在列，只能循环
    $(colHeader[0]).each(function(index, el) {
        colDef[colHeader[0][index].field] = ''; // 该变量只有在创建表时才有用，数据稍有冗余
        if (colHeader[0][index].field == 'desc') {
            colHeader[0][index].formatter = descformatter;
        } else if (colHeader[0][index].field == 'columnNameCN') {
            colHeader[0][index].formatter = nameformatter;
        } else if (colHeader[0][index].field == 'columnName' && $.trim($('#dbType').val()) == 2) {
            colHeader[0][index].formatter = nameDspformatter;
        }
    });

    // 然后加载列定义
    var options = {
        idField: "columnId",
        fit: true,
        fitColumns: true,
        rownumbers: true,
        nowrap: false,
        striped: true,
        singleSelect: true,
        border: false,
        method: 'get',
        columns: colHeader
    };
    if ($.trim($('#readAttr').val()) == 0) {
        options.onDblClickCell = onClickRowBegEdit;
        options.onLoadSuccess = function () {
            $(this).datagrid('enableDnd');
        };
        options.onBeforeDrag = function(row) {
            if (dragDropableMap[_curTblId] === true) {
                return true;
            }
            return false;
        };
        options.onDrop = function (targetRow, sourceRow, point) {
            isRowEditedMap[_curTblId] = true;
        };
    }

    if (tblId < 100) {
        // 注意这里必须使用不同的colDef，否则所有行都指向同一个colDef值
        var rows = [colDef,$.extend({},colDef),$.extend({},colDef),$.extend({},colDef),$.extend({},colDef),$.extend({},colDef),$.extend({},colDef),$.extend({},colDef),$.extend({},colDef),$.extend({},colDef)];
        options.data = rows;
    } else {
        options.url = Ap_servletContext + '/ajax/getColumnList?tblId=' + tblId + '&_t=' + new Date().getTime();
    }
    $('#col_grid_' + tblId).datagrid(options);
}


var newTblId = 0;
// 创建表／视图
function createNewTable(value) {
    if (newTblId > 10) {
        layer.msg("新建了太多项目，慢慢来吧。");
        return false;
    }
    newTblId ++;
    _curTblId = newTblId;
    _createTblHeadDiv(newTblId);

    var loadLy = layer.load(1);
    // 查询表定义信息，动态加载列定义
    $.ajax({
        type: 'get',
        url: Ap_servletContext + '/ajax/getColDef?type=' + $.trim($('#dbType').val()) + '&_t=' + new Date().getTime(),
        success: function (data) {
            layer.close(loadLy);
            if (data.code == 0 && data.data) {
                _createTblGrid(newTblId, data.data.columns);
            } else {
                layer.msg(data.msg + ' (code=' + data.code + ")");
            }
        }
    });
}

// 删除当前项目
function delCurrTable() {
    var pTab = $('#tbl-tabs').tabs('getSelected');
    var tabIdx = $('#tbl-tabs').tabs('getTabIndex', pTab);
    var tabId = pTab.panel('options').id;
    if (tabId == 0) { // 如果是主页，直接关闭
        $('#tbl-tabs').tabs('close', tabIdx);
        return;
    }

    if (tabId < 100 ) {
        // 新建的项目，直接关闭当前tab
        // 还要确认一下是否有填写了内容
        layer.confirm('确定要删除当前新建项目？<br>该操作不可恢复，已经填写的内容不会保存，是否确认删除？', { icon: 7,
            btn: ['确定','取消'] //按钮
        }, function(index) {
            layer.close(index);
            $('#tbl-tabs').tabs('close', tabIdx);
        }, function() {
            // 无操作
        });
        return;
    }

    // 先简单验证tab栏和tablelist中的表明是否一致
    var tblName = pTab.panel('options').title;
    var pTblItem = $('#tblList').datalist("getSelected");
    if (pTblItem == null || pTblItem == undefined) {
        // 可以删除
    } else if (pTblItem._id != undefined && pTblItem.tableName != undefined && tabId == pTblItem._id && pTblItem.tableName == tblName) {
        // 可以删除
    } else {
        // 数据不一致
        layer.msg("当前选择的数据出错了，不能删除。<br>请联系管理员。");
        console.log('tab栏和tablelist中所选数据不一致:', pTblItem, tabId, tblName);
        return;
    }

    layer.confirm('确定要删除选定项目: ' + tblName + '？<br>该操作不可恢复，是否确认删除？', { icon: 7,
        btn: ['确定','取消'] //按钮
    }, function(index) {
        layer.close(index);
        var postData = {};
        postData.tblId = _curTblId;

        var loadLy = layer.load(1);
        $.ajax({
            type: 'post',
            url: Ap_servletContext + '/ajax/delTableDef',
            data: JSON.stringify(postData),
            contentType: "application/json; charset=utf-8",
            success: function (data) {
                layer.close(loadLy);
                if (data.code == 0) {
                    loadLy = layer.load(1);
                    // 删除成功后关闭tab
                    var pp = $('#tbl-tabs').tabs('getSelected');
                    var tabIdx = $('#tbl-tabs').tabs('getTabIndex', pp);
                    $('#tbl-tabs').tabs('close', tabIdx);

                    // 还要刷新table list
                    $('#tblList').datalist({
                        onLoadSuccess: function(data) {
                            var pp = $('#tbl-tabs').tabs('getSelected');
                            var _newTblId = pp.panel('options').id;
                            $('#tblList').datalist("selectRecord", _newTblId);
                        }
                    });
                    $('#tblList').datalist("load", {});
                    layer.close(loadLy);
                } else {
                    layer.msg(data.msg + ' (code=' + data.code + ")");
                }
            }
        });
    }, function() {
        // 无操作
    });
}

// 设置缺省工作环境
function setDevEnv(devType) {
    var loadLy = layer.load(1);
    var postData = {};
    postData.checkFlg = devType;
    if (devType == 1) {
        postData.dbId = $.trim($('#dbId').val());
    }
    $.ajax({
        type: 'post',
        url: Ap_servletContext + '/ajax/setDefaultDbEnv',
        data: JSON.stringify(postData),
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            layer.close(loadLy);
            if (data.code == 0) {
                layer.msg('操作成功');
                // 刷新菜单
                if (devType == 0) {
                    var item = $('#db-tools_menu').menu('findItem', 'setdbenv');
                    $('#db-tools_menu').menu('enableItem', item.target);
                    item = $('#db-tools_menu').menu('findItem', 'unsetdbenv');
                    $('#db-tools_menu').menu('disableItem', item.target);
                } else {
                    var item = $('#db-tools_menu').menu('findItem', 'setdbenv');
                    $('#db-tools_menu').menu('disableItem', item.target);
                    item = $('#db-tools_menu').menu('findItem', 'unsetdbenv');
                    $('#db-tools_menu').menu('enableItem', item.target);
                }
            } else {
                layer.msg(data.msg + ' (code=' + data.code + ")");
            }
        }
    });
}

// 当前所查看的表id（点击左边表一栏时会刷新，tab切换时会刷新）
var _curTblId = null;

// 用来标识当前表是否正在编辑的变量必须是独立的，也就是要定义为map类型，key的值为_curTblId
var editIndexMap = [];
var isRowEditedMap = [];
// 保存当前可以编辑的表
var editableMap = [];
// 保存当前可以拖放操作的表
var dragDropableMap = [];

// 双击表格行，开始编辑，只允许一行一行编辑
function onClickRowBegEdit(index, field, value) {
    if (editableMap[_curTblId] == undefined || editableMap[_curTblId] === false) {
        return false;
    }
    if (_curTblId == undefined || _curTblId == null || _curTblId == '') {
        return false;
    }
    isRowEditedMap[_curTblId] = true;

    if (_endEditing()) {
        var gridObj = _getGrid();
        gridObj.datagrid('selectRow', index).datagrid('editCell', { index: index, field: field });
        var ed = gridObj.datagrid('getEditor', { index: index, field: field });
        if (ed && ed.target) {
            if (field == 'desc') {
                $(ed.target).focus();
            } else {
                if ($(ed.target).closest('td').find("input.textbox-text")[0]) {
                    $(ed.target).closest('td').find("input.textbox-text")[0].focus();
                }
            }
        }
        //$(ed.target).focus();
        editIndexMap[_curTblId] = index;
    }
}

// 显示编辑工具栏
function _displayEditToolbar(dspFlg) {
    var layoutH = '';
    if (dspFlg) {
        layoutH = '125px';  // 这里的高度暂时直接固定，因为画面项目不会增减
        $('#' + _curTblId + ' div._tbl_edit_toolbar').show();
    } else {
        layoutH = '80px';
        $('#' + _curTblId + ' div._tbl_edit_toolbar').hide();
    }

    // 要重新计算layout高度
    var p = $('#tabDiv_' + _curTblId).layout('panel', 'north');	// get the north panel
    var oldHeight = p.panel('panel').outerHeight();
    p.panel('resize', {height: layoutH});
    var newHeight = p.panel('panel').outerHeight();
    $('#tabDiv_' + _curTblId).layout('resize', {
        height: ($('#tabDiv_' + _curTblId).height() + newHeight - oldHeight)
    });
}

// 开始编辑，要先去后台确认该表是否有其他人正在编辑
function chkForEditing() {
    if (_curTblId == null || _curTblId == undefined || _curTblId == 0) {
        // 首页
        if (myUm) {
            myUm.setEnabled();
        }
        return;
    }
    var loadLy = layer.load(1);
    var last_upd = $.trim($('#' + _curTblId + ' input._tbl_last_updtime').val());
    $.ajax({
        type: 'post',
        url: Ap_servletContext + '/ajax/chkTblEditable?tableId=' + _curTblId + '&lastUpd=' + last_upd,
        success: function (data) {
            layer.close(loadLy);
            if (data.code == 0) {
                // 可以开始编辑
                editableMap[_curTblId] = true;
                $('#' + _curTblId + ' input._tbl_name').textbox('readonly', false);
                $('#' + _curTblId + ' input._tbl_name_cn').textbox('readonly', false);
                $('#' + _curTblId + ' input._tbl_desc').textbox('readonly', false);

                // 显示编辑工具栏
                _displayEditToolbar(true);

            } else if (data.code == 1) {
                layer.msg(data.msg);
            } else if (data.code == 2) {
                // 已经被修改过了
                layer.msg(data.msg);
                // 刷新定义数据(先关闭当前tab，再重新打开)
                loadLy = layer.load(1);
                var nowTblId = _curTblId;
                var tabIdx = $('#tbl-tabs').tabs('getTabIndex', $('#tbl-tabs').tabs('getSelected'));
                $('#tbl-tabs').tabs('close', tabIdx);
                _openNewTab(nowTblId);

                // 可以开始编辑
                editableMap[_curTblId] = true;
                $('#' + _curTblId + ' input._tbl_name').textbox('readonly', false);
                $('#' + _curTblId + ' input._tbl_name_cn').textbox('readonly', false);
                $('#' + _curTblId + ' input._tbl_desc').textbox('readonly', false);
                // 显示编辑工具栏
                _displayEditToolbar(true);
                layer.close(loadLy);
                // 提示重新操作
                layer.msg("刷新数据成功，请重新操作．");

            } else if (data.code == 5011 || data.code == 5012) {
                $.messager.confirm({
                    title: '提示信息',
                    msg: data.msg,
                    ok: '强制编辑',
                    cancel: '取消',
                    fn: function(r) {
                        if (r) {
                            var loadLy = layer.load(1);
                            $.ajax({
                                type: 'post',
                                url: Ap_servletContext + '/ajax/forceTblEditable?tableId=' + _curTblId,
                                success: function (data) {
                                    layer.close(loadLy);
                                    if (data.code == 0) {
                                        // 可以开始编辑
                                        editableMap[_curTblId] = true;
                                        $('#' + _curTblId + ' input._tbl_name').textbox('readonly', false);
                                        $('#' + _curTblId + ' input._tbl_name_cn').textbox('readonly', false);
                                        $('#' + _curTblId + ' input._tbl_desc').textbox('readonly', false);

                                    } else {
                                        layer.msg(data.msg + ' code=' + data.code);
                                    }
                                }
                            });
                        }
                    }
                });
            } else {
                layer.msg(data.msg + ' code=' + data.code);
            }
        }
    });
}

// 结束编辑状态
function _endEditing() {
    if (editIndexMap[_curTblId] == null) {
        return true
    }
    var gridObj = _getGrid();
    if (gridObj.datagrid('validateRow', editIndexMap[_curTblId])) {
        gridObj.datagrid('endEdit', editIndexMap[_curTblId]);
        editIndexMap[_curTblId] = null;
        return true;
    } else {
        return false;
    }
}
function endEditing() {
    if (_curTblId == null || _curTblId == undefined || _curTblId == 0) {
        // 首页
        if (myUm) {
            myUm.setDisabled();
        }
        return;
    }
    editableMap[_curTblId] = false;
    dragDropableMap[_curTblId] = false;
    _endEditing();
    var loadLy = layer.load(1);
    $.ajax({
        type: 'post',
        url: Ap_servletContext + '/ajax/endEditable?tableId=' + _curTblId,
        success: function (data) {
            layer.close(loadLy);
            if (data.code == 0) {
                // 隐藏编辑工具栏
                _displayEditToolbar(false);
                _getGrid().datagrid('reload');

            } else {
                layer.msg(data.msg + ' code=' + data.code);
            }
        }
    });
}

// 开启行拖放操作
function enableDragDrop() {
    if (editableMap[_curTblId] == undefined || editableMap[_curTblId] === false) {
        return false;
    }
    if (_curTblId == undefined || _curTblId == null || _curTblId == '') {
        return false;
    }
    dragDropableMap[_curTblId] = true;
}

// 取得当前页的grid
function _getGrid() {
    var prefixId = '#col_grid_' + _curTblId;
    return $(prefixId);
}
// 取得当前grid中当前选中行的索引
function _getGridRowIdx() {
    var gridObj = _getGrid();
    var s1 = gridObj.datagrid('getSelected');
    if (s1 == null || s1 == undefined) {
        return -1;
    }
    var s2 = -2;
    if (s1.columnId) {
        s2 = gridObj.datagrid('getRowIndex', s1.columnId);
    } else {
        s2 = gridObj.datagrid('getRowIndex', s1);
    }
    return s2;
}

// 点击"表说明"输入框时，取消当前grid的行选择
function unselectGridItem() {
    var gridObj = _getGrid();
    gridObj.datagrid('unselectAll');
}

// 添加栏位
function addColumn() {
    _getGrid().datagrid('appendRow', { default: "" });
}

// 插入栏位
function insertColumn() {
    var s2 = _getGridRowIdx();
    if (s2 < 0) {
        // 没有选中行，新增
        layer.msg("必须确定插入项目的位置．");
    } else {
        _getGrid().datagrid('insertRow',{
            index: s2,
            row: { default: "" }
        });
    }
}

// 删除栏位
function delColumn() {
    var s2 = _getGridRowIdx();
    if (s2 < 0) {
        layer.msg("必须选择项目后才能删除．");
    }

    layer.confirm('确定要删除选定项目？<br/>该操作不可恢复，是否确认删除？', { icon: 7,
        btn: ['确定','取消'] //按钮
    }, function(index) {
        layer.close(index);
        if (s2 >= 0) {
            var gridObj = _getGrid();
            gridObj.datagrid('deleteRow', s2);
            gridObj.datagrid('unselectAll');
        }
        isRowEditedMap[_curTblId] = true;
    }, function() {
        // 无操作
    });
}

// 保存所有修改内容
// 前端不详细判断确实是有内容修改，直接把所有数据提交到后台，由后台负责处理
function saveAll() {
    // 要先定位到当前tab
    var prefixId = '#' + _curTblId;
    var tName = $.trim($(prefixId + ' input._tbl_name').textbox('getValue'));
    var tNameCn = $.trim($(prefixId + ' input._tbl_name_cn').textbox('getValue'));
    var tDesc = $.trim($(prefixId + ' input._tbl_desc').textbox('getValue'));
    var tNamep = $.trim($(prefixId + ' input._tbl_name_p').val());
    var tNameCnp = $.trim($(prefixId + ' input._tbl_name_cn_p').val());
    var tDescp = $.trim($(prefixId + ' input._tbl_desc_p').val());
    if (!isRowEditedMap[_curTblId] && tName == tNamep && tNameCn == tNameCnp && tDesc == tDescp) {
        layer.msg("没有修改，不需要保存。");
        return false;
    }

    var postData = {};
    postData.dbId = $.trim($('#dbId').val());
    postData._tbl_id = _curTblId;
    postData._tbl_name = tName;
    postData._tbl_name_cn = tNameCn;
    postData._tbl_desc = tDesc;
    postData._tbl_last_upd = $.trim($(prefixId + ' input._tbl_last_updtime').val());

    $('#col_grid_' + _curTblId).datagrid('acceptChanges');
    postData.column_list = $('#col_grid_' + _curTblId).datagrid('getRows');

    // 对输入值简单验证，新建表时表名重复，列名重复，缺少类型
    var duplicate = false;
    if (_curTblId < 100) {
        var rowData = $('#tblList').datalist('getRows');
        for (x in rowData) {
            if (rowData[x].tableName == tName) {
                duplicate = true;
                break;
            }
        }
        if (duplicate) {
            layer.msg("表名: " + tName + " 与现有的重复，请修改后再保存。");
            return;
        }
    }

    if (postData.column_list.length != undefined && postData.column_list.length > 0 && $.trim($('#dbType').val()) != 2) {
        var colNmArr = [];
        for (x in postData.column_list) {
            var colNm = $.trim(postData.column_list[x].columnName);
            if (colNm == '') {
                continue;
            }
            if (colNmArr.indexOf(colNm) >= 0) {
                layer.msg("列名: " + colNm + " 与现有的重复，请修改后再保存。");
                return;
            }
            colNmArr.push(colNm);
        }
    }

    var loadLy = layer.load(1);
    $.ajax({
        type: 'post',
        url: Ap_servletContext + '/ajax/saveColDefine',
        data: JSON.stringify(postData),
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            layer.close(loadLy);
            if (data.code == 0) {
                // editIndexMap[_curTblId] = null;
                // editableMap[_curTblId] = false;
                // 保存成功后关闭表格的编辑状态，如果是新建表还要刷新tab
                if (_curTblId < 100) {
                    loadLy = layer.load(1);
                    // 刷新当前tab（经试验，只能关闭当前tab,再打开新的tab）
                    var _newTblId = data.data._newTblId;
                    var tabIdx = $('#tbl-tabs').tabs('getTabIndex', $('#tbl-tabs').tabs('getSelected'));
                    $('#tbl-tabs').tabs('close', tabIdx);
                    _openNewTab(_newTblId);

                    $('#tblList').datalist({
                        onLoadSuccess: function(data) {
                            $('#tblList').datalist("selectRecord", _newTblId);
                        }
                    });
                    $('#tblList').datalist("load", {});
                    layer.close(loadLy);
                }
                endEditing();
                $(prefixId + ' input._tbl_last_updtime').val(data.data.lastUpd);
            } else {
                layer.msg(data.msg + ' code=' + data.code);
            }
        }
    });
}

// 备注一栏的显示形式
function descformatter(value, row, index) {
    if (value) {
        var reg = new RegExp("\n", "g");
        var str = value.replace(reg, "<br/>");
        return '<div style="width:100%;display:block;word-break: break-all;word-wrap: break-word;margin-top:3px;margin-bottom:3px">' + str + '</div>';
    }
    return '';
}
// 说明一栏的显示形式
function nameformatter(value, row, index) {
    if (value) {
        return '<div style="width: 100%;display:block;word-break: break-all;word-wrap: break-word">' + value + '</div>';
    }
    return '';
}

function nameDspformatter(value, row, index) {
    if (value) {
        var txt = '';
        var prex = value.lastIndexOf(" ") + 1;
        if (row.type == 'object') {
            txt = value.substring(0, prex).replace(/ /g, "&nbsp;") + '<span data-id="' + index + '" data-value="' + value + '" class="tree-hit tree-expanded"/>+&nbsp;' + value.substring(prex);
        } else if (row.type == 'object array') {
            txt = value.substring(0, prex).replace(/ /g, "&nbsp;") + '<span data-id="' + index + '" data-value="' + value + '" class="tree-hit tree-expanded"/>*&nbsp;' + value.substring(prex);
        } else if (row.type && row.type != 'object array' && row.type.indexOf('array') > 0) {
            txt = value.substring(0, prex).replace(/ /g, "&nbsp;") + '&nbsp;&nbsp;*&nbsp;' + value.substring(prex);
        } else {
            txt = '&nbsp;&nbsp;&nbsp;&nbsp;' + value.replace(/ /g, "&nbsp;");
        }
        return '<span style="font-family:Consolas;font-size:14px">' + txt + '</span>';
    }
    return '';
}

// 导出SQL文
function exportSql(opType) {
    if (opType == 1) {
        if (_curTblId == 0 || _curTblId == undefined || _curTblId == '') {
            return;
        }
        if (_curTblId < 100) {
            layer.msg("创建表时不可直接导出表定义，必须先保存．");
            return;
        }
    }

    var url = Ap_servletContext + '/ajax/exportSql';
    if (opType == 1) {
        // 导出当前打开的表
        var prefixId = '#' + _curTblId;
        var tName = $.trim($(prefixId + ' input._tbl_name').textbox('getValue'));
        url += "?tblName=" + tName;
    }

    var form = $("<form></form>").attr("action", url).attr("method", "post");
    form.appendTo('body').submit().remove();
}

// 创建索引(弹出对话框)
function editIndex() {
    if (_curTblId == 0 || _curTblId == undefined || _curTblId == '') {
        return;
    }
    if (_curTblId < 100) {
        layer.msg("创建表时不可直接创建索引，必须先保存表定义．");
        return;
    }
    var prefixId = '#' + _curTblId;
    var tName = $.trim($(prefixId + ' input._tbl_name').textbox('getValue'));

    $('#tblidx_dlg').dialog({
        title: '创建索引- ' + tName
    });

    // 获取当前表定义数据
    var rowsData = _getGrid().datagrid('getRows');
    var idxCols = [];
    rowsData.forEach(function (value, index, array) {
        if (value.columnName) {
            var item = {};
            item.text = value.columnName;
            item.name = value.columnName;
            idxCols.push(item);
        }
    });

    var idxColField = tblidx_grid_cols[0][1];
    idxColField.editor.options.data = idxCols;

    // 先要查询出现有索引定义
    var idxData = [];
    if (_curTblId > 100) {
        var loadLy = layer.load(1);
        $.ajax({
            type: 'get',
            async: false,
            url: Ap_servletContext + "/ajax/getTblIdxList?tblId=" + _curTblId + '&_t=' + new Date().getTime(),
            success: function (data) {
                layer.close(loadLy);
                idxData = data;
            }
        });
    }

    $('#tblidx_grid').datagrid({
        data: idxData,
        columns: tblidx_grid_cols,
        onDblClickCell: onIdxClickCell
    });
    $('#tblidx_grid').datagrid('reload');

    $('#tblidx_dlg').dialog('open');
}

// 添加索引
var defaultVal = 1;
function addTblIndex() {
    defaultVal ++;
    if (defaultVal > 20) {
        layer.msg('你想干什么？');
        return;
    }
    $('#tblidx_grid').datagrid('appendRow', {idxId: defaultVal});
}

// 删除索引
function delTblIndex() {
    var gridObj = $('#tblidx_grid');
    var s1 = gridObj.datagrid('getSelected');
    if (s1 == null || s1 == undefined) {
        layer.msg('请选择一个项目后再操作．')
        return;
    }
    var s2 = gridObj.datagrid('getRowIndex', s1.idxId);
    if (s2 < 0) {
        layer.msg('数据错误，请刷新画面后再操作．')
        return;
    }

    layer.confirm('确定要删除选定的索引？<br/>该操作不可恢复，是否确认删除？', { icon: 7,
        btn: ['确定','取消'] //按钮
    }, function(index) {
        layer.close(index);
        $('#tblidx_grid').datagrid('deleteRow', s2);
    }, function() {
        // 无操作
    });
}

// 保存索引的修改
function submitTblIdx() {
    $('#tblidx_grid').datagrid('acceptChanges');
    var rowsData = $('#tblidx_grid').datagrid('getRows');
    if (rowsData.length == 0) {
        return;
    }
    var postData = {};
    postData.tblId = _curTblId;
    postData.idxList = rowsData;

    var loadLy = layer.load(1);
    $.ajax({
        type: 'post',
        url: Ap_servletContext + '/ajax/saveTblIdxDefine',
        data: JSON.stringify(postData),
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            layer.close(loadLy);
            if (data.code == 0) {
                // 保存成功
                layer.msg("保存成功。");
                $('#tblidx_dlg').dialog('close');
                _getGrid().datagrid('reload');
            } else {
                layer.msg(data.msg + ' code=' + data.code);
            }
        }
    });
}

// 取消修改(不保存)
function cancelTblIdx() {
    var rowsData = $('#tblidx_grid').datagrid('getRows');
    if (rowsData.length == 0) {
        $('#tblidx_dlg').dialog('close');
        return;
    }
    layer.confirm('确定要取消修改？<br/>该操作不可恢复，是否确认删除？', { icon: 7,
        btn: ['确定','取消'] //按钮
    }, function(index) {
        layer.close(index);
        $('#tblidx_dlg').dialog('close');
    }, function() {
        // 无操作
    });
}

var idxEditIndex = undefined;

function _endIdxEditing() {
    if (idxEditIndex == undefined) {
        return true
    }
    if ($('#tblidx_grid').datagrid('validateRow', idxEditIndex)) {
        $('#tblidx_grid').datagrid('endEdit', idxEditIndex);
        idxEditIndex = undefined;
        return true;
    } else {
        return false;
    }
}

function onIdxClickCell(index, field) {
    if (_endIdxEditing()) {
        $('#tblidx_grid').datagrid('selectRow', index).datagrid('editCell', { index: index, field: field });
        var ed = $('#tblidx_grid').datagrid('getEditor', {index: index, field: field});
        if (ed && ed.target) {
            if (field == 'desc') {
                $(ed.target).focus();
            } else {
                if ($(ed.target).closest('td').find("input.textbox-text")[0]) {
                    $(ed.target).closest('td').find("input.textbox-text")[0].focus();
                }
            }
        }
        idxEditIndex = index;
    }
}

// 查看附件
function attMng() {
    if (_curTblId == 0 || _curTblId == undefined || _curTblId == null) {
        return false;
    }
    var gridObj = $('#tblidx_grid');
    var s1 = gridObj.datagrid('getSelected');
    if (s1 == null || s1 == undefined) {
        // 没有选择时，表示是整个表的附件


    } else {
        // 表示是当前行的附件


    }

    // 弹出对话框
    $('#tblatt_dlg').dialog('open');

}


// 保存索引的修改
function submitTblIdx() {
    $('#tblidx_grid').datagrid('acceptChanges');
    var rowsData = $('#tblidx_grid').datagrid('getRows');
    if (rowsData.length == 0) {
        return;
    }
    var postData = {};
    postData.tblId = _curTblId;
    postData.idxList = rowsData;

    var loadLy = layer.load(1);
    $.ajax({
        type: 'post',
        url: Ap_servletContext + '/ajax/saveTblIdxDefine',
        data: JSON.stringify(postData),
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            layer.close(loadLy);
            if (data.code == 0) {
                // 保存成功
                layer.msg("保存成功。");
                $('#tblidx_dlg').dialog('close');
                _getGrid().datagrid('reload');
            } else {
                layer.msg(data.msg + ' code=' + data.code);
            }
        }
    });
}

// 取消修改(不保存)
function cancelTblIdx() {
    var rowsData = $('#tblidx_grid').datagrid('getRows');
    if (rowsData.length == 0) {
        $('#tblidx_dlg').dialog('close');
        return;
    }
    layer.confirm('确定要取消修改？<br/>该操作不可恢复，是否确认删除？', { icon: 7,
        btn: ['确定','取消'] //按钮
    }, function(index) {
        layer.close(index);
        $('#tblidx_dlg').dialog('close');
    }, function() {
        // 无操作
    });
}

// 使用预定义模板-弹出对话框
function useTemplate() {
    if (_curTblId == 0 || _curTblId == undefined || _curTblId == null) {
        return false;
    }
    // 弹出对话框
    $('#template_dlg').dialog('open');
}

// 使用预定义模板1
function useTemplate1() {
    _getGrid().datagrid('appendRow', { columnName: "valid", type: "tinyint", columnLens: "2", notnull: "Y", default: "1", columnNameCN: "数据是否有效", desc: "0:无效 1:有效" });
    _getGrid().datagrid('appendRow', { columnName: "created_by", type: "bigint", columnLens: "20", notnull: "Y", columnNameCN: "创建者ID" });
    _getGrid().datagrid('appendRow', { columnName: "updated_by", type: "bigint", columnLens: "20", notnull: "Y", columnNameCN: "更新者ID" });
    _getGrid().datagrid('appendRow', { columnName: "created_date", type: "datetime ", notnull: "Y", columnNameCN: "创建时间" });
    _getGrid().datagrid('appendRow', { columnName: "updated_date", type: "datetime ", notnull: "Y", columnNameCN: "创建时间" });
    $('#template_dlg').dialog('close');
}
// 使用预定义模板2
function useTemplate2() {
    _getGrid().datagrid('appendRow', { columnName: "created_by", type: "bigint", columnLens: "20", notnull: "Y", columnNameCN: "创建者ID" });
    _getGrid().datagrid('appendRow', { columnName: "created_date", type: "datetime ", notnull: "Y", columnNameCN: "创建时间" });
    $('#template_dlg').dialog('close');
}

// 查看ER图
function lookDiagram() {

}