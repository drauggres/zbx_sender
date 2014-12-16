zbx_sender
===========================

zbx_sender is library for sending data to a remote Zabbix server. On the Zabbix server an item of type Zabbix trapper should be created with corresponding key. Note that incoming values will only be accepted from hosts specified in Allowed hosts field for this item.

## Installation
```
    npm install zbx_sender
```

## Usage

Simple example:

```
     var util = require("util");

     var options = {
         "zabbix-server" : "10.0.0.171",
         "port" : "10051",
         "realtime" : false,
         "with-timestamps" : true,
         "verbose" : true
     };
     
    var zbx_sender = require('zbx_sender').createZabbixSender(options);

    zbx_sender.on('data',function(resp,data){
         console.log('Got response: '+JSON.stringify(resp));
         data && console.log('    for data: '+data);
     });

    zbx_sender.on('error',function(err,orig,data){
        console.log('Error: '+ err.message);
        orig && console.log('   Orig error: '+ util.inspect(orig));
        data && console.log('   On data: '+ util.inspect(data));
    });

     zbx_sender.send([
         {
             'host': 'TEST',
             "clock" : 1418746700,
             "key" : 'item2',
             "value": 110
         },
         {
             'host': 'TEST',
             "clock" : 1418746710,
             "key" : 'item2',
             "value": 180
         }
     ]);
```
## Options

### zabbix-server
IP address of Zabbix server. If a host is monitored by a proxy, proxy IP address should be used instead.
### port
Specify port number of server trapper running on the server. Default is 10051.
### host
Specify host name as registered in Zabbix frontend. Will be used as default if not specified in sending data.
### source-address
Specify source IP address
### with-timestamps
Each portion of sending data must contain "clock" field with timestamp in Unix timestamp format. If "clock" is not specified, current time will be used.
### real-time
Send values one by one as soon as they are received. By default library will collect data for one second.
### verbose
Verbose mode. Event "data" will return response with items. Usefull then response is "success", but not all items was processed.

## Methods
### send

Take object with required fileds "key" and "value". Optionally can be set "host" (if not specified, will be used default from "option") and "clock" (makes sense only if option "with-timestamps" was set).
## Events
zbx_sender inherits EventEmitter, and will emit this events:
### data
Got response from Zabbix server
### error
Got error while trying to send data