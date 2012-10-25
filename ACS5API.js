var defaultGeo = "for=us:1";
var defaultYr = 2010;
var requestsPending = 0;


	$(document).ready(function(){
		getACSdata();		
	});
	
	function ACS5init(key, defaultsettings) {
		ACS5key = key;
		ACS5defaultGeo = (typeof defaultsettings.geo === "undefined")?defaultGeo:defaultsettings.geo;
		ACS5defaultYr = (typeof defaultsettings.year === "undefined")?defaultYr:defaultsettings.year;
	}
	
	function getACSdata() {
		var $deferred = [];
		requestsPending = $('.acs5APIget').length;
		$('.acs5APIget').each(function(i) {
			if ($(this).data('cell')) {
				$(this).getACS5Cell();
			} else {
				if ($(this).data('var')) {
					try {
						$(this)['getACS5'+$(this).data('var')]();
					}
					catch (err) {
						requestsPending--;
						$(this).fillElemError($(this).data('var')+ ' not defined');
					}
				} else {
					requestsPending--;
					$(this).fillElemError('Syntax error');
				}
			}
		});
	}
	
	 $.fn.getACS5Cell = function() {
			var geo = $(this).data("geo")?$(this).data("geo"):ACS5defaultGeo;
			var yr = $(this).data("yr")?$(this).data("yr"):ACS5defaultYr;
			APIrequest = "http://api.census.gov/data/"+yr+"/acs5?key="+ACS5key+"&get="+$(this).data("cell")+"E,"+$(this).data("cell")+"M&"+geo;
			$.ajax({
				url: APIrequest,
				context:this,
				dataType:"json",
				success:function(data) {
					console.log("- "+data[1][0]);
					$(this).fillElem(data[1][0], data[1][1], {display:$(this).data("display")});
				},
				error:function(jqXHR, textStatus, errorThrown) {
					$(this).fillElemError(textStatus);
				},
				complete:function() {
					requestsPending--;
					if (requestsPending == 0) {derivedResults()}
				}
			});
	}

	$.fn.getACS5TotPop = function () {
			var geo = $(this).data("geo")?$(this).data("geo"):ACS5defaultGeo;
			var yr = $(this).data("yr")?$(this).data("yr"):ACS5defaultYr;
			APIrequest = "http://api.census.gov/data/"+yr+"/acs5?key="+ACS5key+"&get=B01003_001E,B01003_001M&"+geo;
			$.ajax({
				url: APIrequest,
				context:this,
				dataType:"json",
				success:function(data) {
					console.log("- "+data[1][0]);
					$(this).fillElem(data[1][0], data[1][1], {display:$(this).data("display")});
				},
				error:function(jqXHR, textStatus, errorThrown) {
					$(this).fillElemError(textStatus);
				},
				complete:function() {
					requestsPending--;
					if (requestsPending == 0) {derivedResults()}
				}
			});
	}

	function derivedResults() {
				$('.acs5APIcalc').each(function() {
					operandsArray = $(this).data('operands').split(",");
					var check = ACScheckOperands(operandsArray);
					if (check.OK) {
						switch ($(this).data('operator')) {
							case ("copy") : 
								$(this).fillElem(""+check.ests[0], ""+check.MOEs[0], {display:$(this).data("display"), precision: check.maxPrec});
								break;
							case ("sum") : 
								var result = ACSsum(check.ests, check.MOEs);
								if (result.OK) {
									$(this).fillElem(""+result.est, ""+result.MOE, {display:$(this).data("display"), precision: check.maxPrec});
								} else {
									$(this).fillElemError(result.message);
								}
								break;
							case ("proportion") : 
								var result = ACSproportion(check.ests[0], check.ests[1], check.MOEs[0], check.MOEs[1]);
								if (result.OK) {
									$(this).fillElem(""+result.est, ""+result.MOE, {display:$(this).data("display"), precision: 1, percentage: true});
								} else {
									$(this).fillElemError(result.message);
								}
								break;
							default : $(this).html("unable to calculate");
						}
					} else {
						$(this).fillElemError(check.message);
					}
				});
	}
	
	function ACScheckOperands (elemArray) {
		var result = new Object();
		result.maxPrec = 0;
		result.ests = [];
		result.MOEs = [];
		result.OK = true;
		$.map(elemArray, function(e,i) {
			if ($("#"+e).length == 0) {
				result.message = e + ' not found';
				result.OK = false;
				return result;
			}
			if ($("#"+e).data('est') == '' || $("#"+e).data('moe') == '') {
				result.message = 'no data at ' + e;
				result.OK = false;
				return result;
			}
			try {
				var est = parseFloat($("#"+e).data('est'));
				result.ests.push(est);
				var MOE = parseFloat($("#"+e).data('moe'));
				result.MOEs.push(MOE);
				result.maxPrec = Math.max(result.maxPrec, parseInt($("#"+e).data('precision')));
			}
			catch(err) {
				result.message = err;
				result.OK = false;
				return result;
			}
		});
		return result;
	}
	
	function ACSsum(estArray, MOEArray) {
		var sumEst = 0;
		var sumMOEsq = 0;
		var result = new Object();
		result.OK = true;
		try {
			$.each(estArray, function(index, value) {sumEst += value});
			$.each(MOEArray, function(index, value) {sumMOEsq += value*value});
			result.est = sumEst;
			result.MOE = Math.sqrt(sumMOEsq);
		}
		catch (err) {
			result.message = err;
			result.OK = false;
		}
		return result;
	}

	function ACSproportion(numEst, denEst, numMoe, denMoe) {
		var result = new Object();
		result.OK = true;
		try {
			result.est = numEst/denEst;
			var MOEnum2 = numMoe * numMoe;
			var p2MOEden2 = result.est*result.est*denMoe*denMoe;
			result.MOE = Math.sqrt((MOEnum2 >= p2MOEden2)?MOEnum2-p2MOEden2:MOEnum2+p2MOEden2)/denEst;
		}
		catch (err) {
			result.message = err;
			result.OK = false;
		}
		return result;
	}

	$.fn.fillElem = function (est, moe, settings) {
			if (typeof settings.precision === "undefined") {
				precision = Math.max(est.indexOf(".")>=0?est.length-est.indexOf(".")-1:0,moe.indexOf(".")>=0?moe.length-moe.indexOf(".")-1:0)
			} else {
				precision = settings.precision
			}
			var estNum = parseFloat(est);
			var moeNum = parseFloat(moe);
			var percentage = (typeof settings.percentage === "undefined")?false:settings.percentage;
			var display = (typeof settings.display === "undefined")?"both":settings.display;
			$(this).data("est",est);
			$(this).data("moe",moe);
			$(this).data("precision",precision);
			var displayEst = (percentage)?''+(100*estNum).toFixed(precision)+"%":number_format(estNum, precision);
			var displayMOE = (percentage)?''+(100*moeNum).toFixed(precision):number_format(moeNum, precision);
			switch (display) {
				case ("none"): $(this).html(""); break;
				case ("est"): $(this).html(displayEst); break;
				case ("moe"): $(this).html(displayMOE); break;
				case ("both"): ;
				default: $(this).html(displayEst+ " (+/- " + displayMOE + ")");
			}
		}
	$.fn.fillElemError = function (error, settings) {
		$(this).html(error);
		$(this).addClass("acs5error");
		$(this).data("error",error);
	}

	function number_format (number, decimals, dec_point, thousands_sep) {
  // https://raw.github.com/kvz/phpjs/master/functions/strings/number_format.js
  number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
  var n = !isFinite(+number) ? 0 : +number,
    prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
    sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
    dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
    s = '',
    toFixedFix = function (n, prec) {
      var k = Math.pow(10, prec);
      return '' + Math.round(n * k) / k;
    };
  // Fix for IE parseFloat(0.55).toFixed(0) = 0;
  s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
  if (s[0].length > 3) {
    s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
  }
  if ((s[1] || '').length < prec) {
    s[1] = s[1] || '';
    s[1] += new Array(prec - s[1].length + 1).join('0');
  }
  return s.join(dec);
}

// Code to deal with IE idiocracies: console.log only defined after development tools are opened
if (!window.console) {var console = {};}
if (!console.log) {console.log = function() {};}

// Code to deal with IE idiocracies: make the Ajax calls work CORS
// Code copied from https://github.com/tlianza/ajaxHooks/blob/master/src/ajax/xdr.js

(function( jQuery ) {

if ( window.XDomainRequest ) {
	jQuery.ajaxTransport(function( s ) {
		if ( s.crossDomain && s.async ) {
			if ( s.timeout ) {
				s.xdrTimeout = s.timeout;
				delete s.timeout;
			}
			var xdr;
			return {
				send: function( _, complete ) {
					function callback( status, statusText, responses, responseHeaders ) {
						xdr.onload = xdr.onerror = xdr.ontimeout = xdr.onprogress = jQuery.noop;
						xdr = undefined;
						complete( status, statusText, responses, responseHeaders );
					}
					xdr = new XDomainRequest();
					xdr.open( s.type, s.url );
					xdr.onload = function() {
						callback( 200, "OK", { text: xdr.responseText }, "Content-Type: " + xdr.contentType );
					};
					xdr.onerror = function() {
						callback( 404, "Not Found" );
					};
					xdr.onprogress = function() {};
					if ( s.xdrTimeout ) {
						xdr.ontimeout = function() {
							callback( 0, "timeout" );
						};
						xdr.timeout = s.xdrTimeout;
					}
					xdr.send( ( s.hasContent && s.data ) || null );
				},
				abort: function() {
					if ( xdr ) {
						xdr.onerror = jQuery.noop();
						xdr.abort();
					}
				}
			};
		}
	});
}
})( jQuery );