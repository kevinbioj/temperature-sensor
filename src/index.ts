import { InfluxDB, Point } from "@influxdata/influxdb-client";
import NodeDHTSensor from "node-dht-sensor";
import Cron from "croner";

if (
  !process.env.INFLUXDB_URL ||
  !process.env.INFLUXDB_TOKEN ||
  !process.env.INFLUXDB_ORG ||
  !process.env.INFLUXDB_BUCKET
) {
  throw new Error("Environment variables 'INFLUXDB_URL' and 'INFLUXDB_TOKEN' must be defined!");
}

if (!process.env.SENSOR_TYPE || !process.env.SENSOR_PIN) {
  throw new Error("Environment variables 'SENSOR_TYPE' and 'SENSOR_PIN' must be defind!");
}

const sensorType = +process.env.SENSOR_TYPE;
const sensorPin = +process.env.SENSOR_PIN;

if (sensorType !== 11 && sensorType !== 22)
  throw new Error(`Invalid sensor type: must be 11 for DHT11 or 22 for DHT22/AM2302`);

if (Number.isNaN(sensorPin) || sensorPin < 0)
  throw new Error(`Invalid sensor pin '${process.env.SENSOR_PIN}'.`);

console.log("== Temperature sensor application ==");
NodeDHTSensor.promises.setMaxRetries(10);

const database = new InfluxDB({
  url: process.env.INFLUXDB_URL,
  token: process.env.INFLUXDB_TOKEN,
});

Cron("* * * * *", async function fetchLoop() {
  const { temperature, humidity } =
    process.env.NODE_ENV === "production"
      ? await NodeDHTSensor.promises.read(sensorType, sensorPin)
      : { temperature: random(15, 35), humidity: random(40, 70) };
  const at = new Date();
  const writeApi = database.getWriteApi(
    process.env.INFLUXDB_ORG!,
    process.env.INFLUXDB_BUCKET!,
    "ms"
  );
  writeApi.writePoints([
    new Point("temperature").tag("sensor", "salon").timestamp(at).floatField("value", temperature),
    new Point("humidity").tag("sensor", "salon").timestamp(at).floatField("value", humidity),
  ]);
  await writeApi.close();
  console.log(
    `[${at.toISOString()}] T = ${temperature.toFixed(1)}°C | H = ${humidity.toFixed(1)}%`
  );
});

// ---

function random(min: number, max: number) {
  return min + Math.random() * (max - min);
}
