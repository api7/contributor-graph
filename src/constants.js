export const generateDefaultOption = ({ handleShareClick = () => {} }) => {
  return {
    color: ["#39a85a", "#4385ee", "#fabc37", "#2dc1dd", "#f972cf", "#8331c8"],
    legend: {
      top: "5%",
      data: [],
      textStyle: {
        fontSize: 14,
      },
    },
    toolbox: {
      feature: {
        myShare: {
          show: true,
          title: "Share",
          icon: "path://M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z",
          onclick: function () {
            handleShareClick();
          },
        },
      },
      left: "210px",
      top: "3px",
      iconStyle: {
        color: "#1d9bf0",
        borderColor: "#1d9bf0"
      },
      emphasis: {
        iconStyle: {
          textPosition: "right"
        }
      }
    },
    dataset: [],
    title: {
      text: "Contributor Over Time",
    },
    tooltip: {
      trigger: "axis",
    },
    xAxis: {
      type: "time",
      nameLocation: "middle",
      axisLabel: {
        show: true,
        textStyle: {
          fontSize: 14,
        },
        rotate: 45,
      },
    },
    yAxis: {
      name: "",
      axisLabel: {
        show: true,
        textStyle: {
          fontSize: 14,
        },
      },
    },
    series: [],
    grid: {
      x: 10,
      x2: 15,
      y: 80,
      containLabel: true,
      y2: 5,
    },
  };
};

export const generateMonthlyActivityOption = ({
  handleShareClick = () => {},
}) => {
  return {
    toolbox: {
      feature: {
        myShare: {
          show: true,
          title: "Share",
          icon: "path://M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z",
          onclick: function () {
            handleShareClick();
          },
        },
      },
      left: "260px",
      top: "3px",
      iconStyle: {
        color: "#1d9bf0",
        borderColor: "#1d9bf0"
      },
      emphasis: {
        iconStyle: {
          textPosition: "right"
        }
      }
    },
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const text = params.map((item) => {
          return `<span>${item.marker}${item.seriesName}&nbsp&nbsp <b>${item.value[0]}</b></span><br>`;
        });

        return [params[0].value[2].substring(0, 7), text]
          .join("</br>")
          .replace(/,/g, "");
      },
    },
    color: ["#39a85a", "#4385ee", "#fabc37", "#2dc1dd", "#f972cf", "#8331c8"],
    legend: {
      top: "10%",
      data: [],
      textStyle: {
        fontSize: 16,
      },
    },
    dataset: [],
    title: {
      text: "Monthly Active Contributors",
      subtext:
        "The number of contributors who committed to main branch in each month",
    },
    xAxis: {
      type: "time",
      nameLocation: "middle",
      axisLabel: {
        show: true,
        textStyle: {
          fontSize: 14,
        },
        rotate: 45,
      },
    },
    yAxis: {
      name: "",
      axisLabel: {
        show: true,
        textStyle: {
          fontSize: 14,
        },
      },
    },
    series: [],
    grid: {
      x: 10,
      x2: 15,
      y: 80,
      containLabel: true,
      y2: 10,
    },
  };
};

export const DEFAULT_COLOR = "#39a85a";

export const DEFAULT_SEARCHBAR_STYLE = {
  display: "flex",
  justifyContent: "center",
  flexDirection: "column",
  width: "600px",
};

export const DEFAULT_CONTAINER_STYLE = {
  width: "996px",
  border: "1px solid #dadce0",
  borderRadius: "12px",
};
