# Presentation

SpeedTest is a simple script used to estimate your connection speed in KiloBytes per second. No Flash, just HTML5.

Works with the latest versions of Firefox, Chrome and Safari.

# Installation

Add the *speedtest.js* file to your web page :

```html
<script src="./speedtest.js"></script>
```

And finish by adding the *speedtest.php* file on your server.

# Public interface

Here is a simple presentation of the SpeedTest interface.

## Constructor

```
SpeedTest( settings, startNow )
```

`settings` must contain an object with the properties or events you want to modify, example :

```js
var settings = {

  download: {
    onprogress: function() { //... }
  },

  maxTime: 10000

}
```

`startNow` is used to launch immediatly a double request (download AND upload).

## Event handlers

```
Function download.onprogress ( Number instantSpeed )
Function download.onload ( Number averageSpeed )

Function upload.onprogress ( Number instantSpeed )
Function upload.onload ( Number averageSpeed )
```

Example of use :

```js
var STInstance = new SpeedTest();

STInstance.download.onprogress = function(speed) {
  console.log('Actual download speed : '+ speed);
};
```

## Properties

```
Boolean requesting
Number maxTime
String serverFile
```

`requesting` indicates if the SpeedTest instance is actually running a request. THIS IS READ-ONLY!

`maxTime` is the maximum time you want to see a request running (a request is just a download or an upload, not the two of them). Zero means there is no limit, the request will stop until all the data has been received/sent.

`serverFile` is just the HTTP address for the *speedtest.php* file.

## Methods
```
Void startRequest( download, twoRequests )
```

`download` : *true* for download, *false* for upload.

`twoRequests` allows you to run two requests with a single use of `startRequest()`. If `download` is set at *true*, it will start with the downloading test and will continue with the uploading test. If `download`is at *false*, it will do the opposite.