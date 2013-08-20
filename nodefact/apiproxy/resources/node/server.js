var request = require('request');
var http = require('http');
var urlparse = require('url');
var util = require('util');
var usergrid = require('usergrid');


// This example does not use security. I simply gave the guest role read/write access to the restaurants table in app services.
var client = new usergrid.client({
    orgName: 'YOUR_APPSERVICES_ORG_HERE',
    appName: 'YOUR_APPSERVICES_APP_HERE',
    logging: false
});

function sendError(resp, code, msg) {
  var o = { 'error': msg };
  resp.writeHead(code, {'Content-Type': 'application/json'});
  resp.end(JSON.stringify(o));
}

function populateUG(restResponse, resp) {
    var options = {
        method: 'POST',
        endpoint: 'restaurants',
        body: restResponse.response.data
    };
    client.request(options, function (err,data) {
        if (err) {
            // error
            sendError(resp, 400, util.format('Error response %s from API Services.', err.message));
        } else {
            // success
            resp.writeHead(200, {'Content-Type': 'application/json'});
            var o = {message: "OK", extMessage: "wrote records to usergrid", data: restResponse.response};
            resp.end(JSON.stringify(o));
        }
    });
}

function gogetit(zip, resp) {
    // url would need to be updated to point to the proxy you create
    var url = util.format(
    'http://carlos-free-test.apigee.net/v1/factual/t/restaurants-us?filters={"postcode":{"$eq":"%s"}}', 
    zip);
    request(url, function(err,result,body) {
        if (err) {
            sendError(resp, 400, util.format('Error response %s from web service.', err.message));
            return;
        }
        var restResponse = JSON.parse(body);
        if (restResponse.status !== 'ok') {
            sendError(resp, 500, 'Invalid response');
        } else {
            populateUG(restResponse, resp);
        }
    }); 
}

var svr = http.createServer(function(req, resp) {
    var parsed = urlparse.parse(req.url, true);
    if (!parsed.query.zip) {
        sendError(resp, 400, 'Missing query parameter "zip"');
    } else {
         gogetit(parsed.query.zip, resp);
    }
});

svr.listen(9000, function() {
  console.log('Node Mashup sample app is running on port 9000');
});