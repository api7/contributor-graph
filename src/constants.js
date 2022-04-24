export const generateDefaultOption = ({ handleShareClick = () => {}, handleCopyClick = () => {}, handleDownloadClick = () => {} }) => {
  return {
    color: ["#39a85a", "#4385ee", "#fabc37", "#2dc1dd", "#f972cf", "#8331c8"],
    legend: {
      top: "7%",
      data: [],
      textStyle: {
        fontSize: 14,
      },
    },
    toolbox: {
      itemSize: 20,
      feature: {
        myShare: {
          show: false,
          title: "Share",
          icon: "image://https://static.apiseven.com/202108/1649674034262-bd663d25-bd90-43ab-8156-60035aaaa83e.png",
          onclick: function () {
            handleShareClick();
          },
        },
        myCopyLink: {
          show: false,
          title: "Copy Link",
          icon: "image://https://static.apiseven.com/202108/1649675145286-bf75cd63-519a-442e-9928-ac51534dfd97.png",
          onclick: function () {
            handleCopyClick();
          },
        },
        mySaveAsImage: {
          show: false,
          title: "Save Image",
          icon: "image://https://static.apiseven.com/202108/1649673632197-35d7c888-1fd6-463c-ac38-2c7179a4a168.png",
          type: "jpg",
          onclick: function () {
            handleDownloadClick();
          },
        },
      },
      left: "210px",
      emphasis: {
        iconStyle: {
          textPosition: "bottom",
        }
      }
    },
    dataset: [],
    title: {
      left:'center',
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
  handleCopyClick = () => {},
  handleDownloadClick = () => {},
}) => {
  return {
    toolbox: {
      itemSize: 20,
      feature: {
        myShare: {
          show: false,
          title: "Share",
          icon: "image://https://static.apiseven.com/202108/1649674034262-bd663d25-bd90-43ab-8156-60035aaaa83e.png",
          onclick: function () {
            handleShareClick();
          },
        },
        myCopyLink: {
          show: false,
          title: "Copy Link",
          icon: "image://https://static.apiseven.com/202108/1649675145286-bf75cd63-519a-442e-9928-ac51534dfd97.png",
          onclick: function () {
            handleCopyClick();
          },
        },
        mySaveAsImage: {
          show: false,
          title: "Save Image",
          icon: "image://https://static.apiseven.com/202108/1649673632197-35d7c888-1fd6-463c-ac38-2c7179a4a168.png",
          type: "jpg",
          onclick: function () {
            handleDownloadClick();
          },
        },
      },
      left: "260px",
      emphasis: {
        iconStyle: {
          textPosition: "bottom"
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
      left:'center',
      subtext:
        "The number of contributors who committed to main branch in each month",
      itemGap: 16,
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
