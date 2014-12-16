var net = require("net");
var util = require("util");
var events = require("events");

var zbx_sender = function (options) {
    this.c_opts = {};
    if (options) {
        if (options["zabbix-server"]) {
            this.c_opts["host"] = options["zabbix-server"];
        } else {
            this.emit('error',new Error('missing required parameter "zabbix-server"'))
        }
        if (options["port"]) {
            this.c_opts["port"] = options["port"]
        } else {
            this.c_opts["port"] = "10051"
        }
        if (options["host"]) {
            this["host"] = options["host"]
        }
        if (options["source-address"]) {
            this.c_opts["source-address"] = options["source-address"]
        }
        if (options["verbose"] != null){
            this["verbose"] = options["verbose"]
        }
        if (options["realtime"] != null){
            this["realtime"]=options["realtime"]
        }
        if (options["with-timestamps"]!= null){
            this["with-timestamps"] = options["with-timestamps"]
        }
    }
    this.delay = 1000;
    this._buffer = [];
    this._inProggress = false;
};

util.inherits(zbx_sender, events.EventEmitter);

zbx_sender.prototype._set = function (src, key) {
    if (src[key] == null) {
        if (this[key] == null) {
            throw new Error('missing required parameter "'+key+'"');
        } else {
            return this[key];
        }
    } else {
        return src[key];
    }
};
zbx_sender.prototype._send = function(){
    var me = this;
    if (me._inProggress){
        return;
    }
    if (!me._buffer.length){
        me.emit('error', new Error('nothing to send'));
        return;
    }
    var data=me._buffer.slice(0,250);
    me._buffer=data.slice(250);
    me.inProggress = true;
    if (me["with-timestamps"]){
        data["clock"] =  new Date().getTime() / 1000 |0 ;
    }
    var req = {"request": "sender data", "data": data};

    var str = JSON.stringify(req)
        , message = new Buffer(5 + 8)
        , payload = new Buffer(str, "utf8");
    message.fill("\x00");
    message.write("ZBXD\x01");
    message = Buffer.concat([message, payload]);
    message.writeUInt32LE(payload.length, 5);

    var client = net.connect(this.c_opts,
        function () {
            client.write(message);
        });
    var result = new Buffer(0);
    client.on("data", function (data) {
        result = Buffer.concat([result, data]);

    });
    client.on("end", function () {
        var head = result.slice(0, 5);
        if (head.toString() == "ZBXD\x01") {
            if (result.length > 5) {
                var resp = JSON.parse(result.slice(13));
                if (me["verbose"]){
                    me.emit('data',resp, str);
                } else {
                    me.emit('data',resp);
                }

            }
        } else {
            me.emit('error', new SyntaxError("Invalid response"),result, str);
        }
        me._inProggress = false;
        if (me._buffer.length){
            me._send();
        }
    });
    client.on("error", function (err) {
        me.emit('error',new Error('Network error'), err, str)
    })
};

zbx_sender.prototype.send = function (options) {
    var me = this;

    var temp = {};

    if (!options) {
        me.emit('error',new Error('missing options'))
    } else {
        var now = new Date().getTime() / 1000 |0;
            if (options instanceof Array) {
                options.forEach(function (v) {
                    try {
                        var d = {};
                        d["host"] = me._set(v, "host");
                        d["key"] = me._set(v, "key");
                        d["value"] = me._set(v, "value");
                        if (me["with-timestamps"]){
                            d["clock"] = v["clock"] || now ;
                        }
                        me._buffer.push(d);
                    } catch (e){
                        me.emit('error',e,null,v);
                    }
                })
            } else {
                try {
                    temp["host"] = me._set(options, "host");
                    temp["key"] = me._set(options, "key");
                    temp["value"] = me._set(options, "value");
                    if (me["with-timestamps"]){
                        temp["clock"] = options["clock"] || now ;
                    }
                    me._buffer.push(temp);
                } catch (e){
                    me.emit('error',e)
                }
            }
    }
    if (!me._inProggress ) {
        if (me['realtime']) {
            me._send();
        } else {
            if (!me.timeoutId) {
                me.timeoutId = setTimeout(function () {
                    me.timeoutId = 0;
                    me._send()
                }, me.delay);
            }
        }

    }

};
exports.createZabbixSender = function (options) {
    return new zbx_sender(options);
};


/*
format for "-T, --with-timestamps" option

{
 "request":"sender data",
 "data":[
   {
    "host":"TEST",
    "key":"item2",
    "value":"201",
    "clock":1418670180}],
  "clock":1418670320}
 */
