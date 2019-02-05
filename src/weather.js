const Tinkerforge = require('tinkerforge');
const logUpdate = require('log-update');

let LIGHT;
let LIGHT_2;
let LIGHT_3;
let BARO;
let BARO_2;
let HUMI;
let HUMI_2;
let al;
let h;
let b;
let ipcon = new Tinkerforge.IPConnection();
const outputData = [];
let alDivider = 100;
let hDivider = 100;

const errorOutput = require('./error.js');

function ipconConnect(HOST, PORT) {
	ipcon.connect(HOST, PORT,
		error => {
			console.error(errorOutput.error(error));
			process.exit();
		}
	);
}

function getUids(HOST, PORT) {
	ipconConnect(HOST, PORT);
	ipcon.on(Tinkerforge.IPConnection.CALLBACK_CONNECTED,
		() => {
			ipcon.enumerate();
		}
	);
	ipcon.on(Tinkerforge.IPConnection.CALLBACK_ENUMERATE,
		(uid, a, b, c, d, deviceIdentifier) => {
			if (deviceIdentifier === Tinkerforge.BrickletAmbientLight.DEVICE_IDENTIFIER) {
				LIGHT = uid;
			}

			if (deviceIdentifier === Tinkerforge.BrickletAmbientLightV2.DEVICE_IDENTIFIER) {
				LIGHT_2 = uid;
			}

			if (deviceIdentifier === Tinkerforge.BrickletAmbientLightV3.DEVICE_IDENTIFIER) {
				LIGHT_3 = uid;
			}

			if (deviceIdentifier === Tinkerforge.BrickletBarometer.DEVICE_IDENTIFIER) {
				BARO = uid;
			}

			if (deviceIdentifier === Tinkerforge.BrickletBarometerV2.DEVICE_IDENTIFIER) {
				BARO_2 = uid;
			}

			if (deviceIdentifier === Tinkerforge.BrickletHumidity.DEVICE_IDENTIFIER) {
				HUMI = uid;
			}

			if (deviceIdentifier === Tinkerforge.BrickletHumidityV2.DEVICE_IDENTIFIER) {
				HUMI_2 = uid;
			}
		}
	);
}

function tfinit(HOST, PORT) {
	if (LIGHT_2 || LIGHT || BARO || HUMI) {
		ipcon = new Tinkerforge.IPConnection();
		if (LIGHT_3) {
			al = new Tinkerforge.BrickletAmbientLightV2(LIGHT_3, ipcon);
		} else if (LIGHT_2) {
			al = new Tinkerforge.BrickletAmbientLight(LIGHT_2, ipcon);
		} else if (LIGHT) {
			al = new Tinkerforge.BrickletAmbientLight(LIGHT, ipcon);
			alDivider = 10;
		}

		if (BARO_2) {
			b = new Tinkerforge.BrickletBarometer(BARO_2, ipcon);
		} else if (BARO) {
			b = new Tinkerforge.BrickletBarometer(BARO, ipcon);
		}

		if (HUMI_2) {
			h = new Tinkerforge.BrickletHumidityV2(HUMI_2, ipcon);
		} else if (HUMI) {
			h = new Tinkerforge.BrickletHumidity(HUMI, ipcon);
			hDivider = 10;
		}

		ipconConnect(HOST, PORT);
	} else {
		console.error('ERROR: nothing connected');
		process.exit();
	}
}

function tfdataGet() {
	if (h) {
		h.getHumidity(
			humidity => {
				outputData[0] = (humidity / hDivider) + ' %RH';
			},
			error => {
				outputData[0] = errorOutput.error(error);
			}
		);
	}

	if (b) {
		b.getAirPressure(
			airPressure => {
				outputData[1] = (airPressure / 1000) + ' mbar';
			},
			error => {
				outputData[1] = errorOutput.error(error);
			}
		);
		b.getChipTemperature(
			temperature => {
				outputData[2] = (temperature / 100) + ' \u00B0C';
			},
			error => {
				outputData[2] = errorOutput.error(error);
			}
		);
	}

	if (al) {
		al.getIlluminance(
			illuminance => {
				outputData[3] = (illuminance / alDivider) + ' Lux';
			},
			error => {
				outputData[3] = errorOutput.error(error);
			}
		);
	}
}

function getTime(date) {
	return ((date.getHours() < 10 ? '0' : '') + date.getHours()) + ':' + ((date.getMinutes() < 10 ? '0' : '') + date.getMinutes()) + ':' + ((date.getSeconds() < 10 ? '0' : '') + date.getSeconds());
}

function output() {
	logUpdate(
		`
Relative Humidity: ${outputData[0]}
Air pressure:      ${outputData[1]}
Temperature:       ${outputData[2]}
Illuminance:       ${outputData[3]}
Time:              ${getTime(new Date())}
`
	);
}

function simpleOutput(HOST, PORT) {
	setTimeout(() => {
		tfinit(HOST, PORT);
		ipcon.on(Tinkerforge.IPConnection.CALLBACK_CONNECTED,
			() => {
				tfdataGet();
			}
		);
		setTimeout(() => {
			output();
			ipcon.disconnect();
			process.exit(0);
		}, 10);
	}, 25);
}

function liveOutput(HOST, PORT, WAIT) {
	setTimeout(() => {
		tfinit(HOST, PORT);
	}, 150);
	setInterval(() => {
		tfdataGet();
		output();
	}, WAIT);
}

module.exports.tfget = function (HOST, PORT, WAIT, live) {
	getUids(HOST, PORT);
	if (live) {
		liveOutput(HOST, PORT, WAIT);
	} else {
		simpleOutput(HOST, PORT);
	}
};
