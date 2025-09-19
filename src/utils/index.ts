import { toastController } from "@ionic/vue";
import { DateTime } from "luxon";
import store from "@/store";
import Papa from 'papaparse'
import { saveAs } from 'file-saver';

const dateOrdinalSuffix = {
  1: 'st',
  21: 'st',
  31: 'st',
  2: 'nd',
  22: 'nd',
  3: 'rd',
  23: 'rd'
} as any

const showToast = async (message: string) => {
  const toast = await toastController
    .create({
      message,
      duration: 3000,
      position: "top",
    })
  return toast.present();
}

const formatUtcDate = (value: any, outFormat: string) => {
  return DateTime.fromMillis(value, { zone: 'utc' }).setZone(store.state.user.current.userTimeZone).toFormat(outFormat ? outFormat : 'MM-dd-yyyy')
}

function getDateWithOrdinalSuffix(time: any) {
  if (!time) return "-";
  const dateTime = DateTime.fromMillis(time);
  const suffix = dateOrdinalSuffix[dateTime.day] || "th"
  return `${dateTime.day}${suffix} ${dateTime.toFormat("MMM yyyy")}`;
}

const parseCsv = async (file: File, options?: any) => {
  return new Promise ((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results: any) {
        if (results.errors.length) {
          reject(results.error)
        } else {
          resolve(results.data)
        }
      },
      ...options
    });
  })
}

// Here we have created a JsonToCsvOption which contains the properties which we can pass to jsonToCsv function

interface JsonToCsvOption {
  parse?: object | null;
  encode?: object | null;
  name?: string;
  download?: boolean;
}

const jsonToCsv = (file: any, options: JsonToCsvOption = {}) => {
  const csv = Papa.unparse(file, {
    ...options.parse
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  if (options.download) {
    saveAs(blob, options.name ? options.name : "default.csv");
  }

  return blob;
};

const getColorByDesc = (desc: string) => ({
  "Approved": "primary",
  "Authorized": "medium",
  "Cancelled": "danger",
  "Completed": "success",
  "Created": "medium",
  "Declined": "danger",
  "Held": "warning",
  "Not-Authorized": "warning",
  "Not-Received": "warning",
  "Pending": "warning",
  "Received": "success",
  "Refunded": "success",
  "Settled": "success",
  "Shipped": "success",
  "default": "medium"
} as any)[desc]

const currentSymbol: any = {
  "USD": "$",
  "EUR": "€",
  "JPY": "¥"
}

// formats amount into currency with symbol and two decimal places, defaults to "0.00" if invalid
const formatCurrency = (amount: any, code: string) => {
  const symbol = currentSymbol[code] || code || ""
  if(amount == null) return "0.00"
  return `${symbol} ${amount.toFixed(2)}`
}

export { formatUtcDate, formatCurrency, getColorByDesc, getDateWithOrdinalSuffix, jsonToCsv, JsonToCsvOption, parseCsv, showToast }
