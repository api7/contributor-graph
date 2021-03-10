import React from 'react';
// import { useEffect, useState } from 'react';
import { cloneDeep } from "lodash";
import { FormControl, InputGroup, ListGroup, Button } from "react-bootstrap";
import ReactECharts from "echarts-for-react";
// import { CopyToClipboard } from "react-copy-to-clipboard";

import 'bootstrap/dist/css/bootstrap.min.css';

// import './App.css';
const getMonths = (month = 12) => {
  const d = new Date();
  const result = [];
  for (let i = 0; i < month; i++) {
      d.setMonth(d.getMonth() - 1);
      const m = d.getMonth() + 1;
      const month = m < 10 ? `0${m}` : m;
      result.push(`${d.getFullYear()}-${month}`);
  }
  return result.sort();
};

function getMonthBetween(start,end){  
  let result = [];  
  let s = start.split("-");  
  let e = end.split("-");  
  let min = new Date();  
  let max = new Date();  
  min.setFullYear(s[0],s[1]);  
  max.setFullYear(e[0],e[1]);  
  
  let curr = min;  
  let str = "";
  while(curr <= max){  
      let month = curr.getMonth();  
      if(month===0){
          str=(curr.getFullYear()-1)+"-"+12;
      }else{
          str=curr.getFullYear()+"-"+(month<10?("0"+month):month);
      }
      result.push(str);  
      curr.setMonth(month+1);  
  }  
  return result;  
}  

const DEFAULT_OPTIONS = {
  legend: {
 data: []
},
 dataset: [],
 title: {
     text: 'Contributor Over Time'
 },
 tooltip: {
     trigger: 'axis'
 },
 xAxis: {
     type: 'time',
     nameLocation: 'middle'
 },
 yAxis: {
     name: ''
 },
 series: []
};

function App() {
  // const { host } = '';
  const [loading, setLoading] = React.useState(false);
  const [dataSource, setDataSource] = React.useState(
      {}
  );
  const [activeDate, setActiveDate] = React.useState("1year");
  const [xAxis, setXAxis] = React.useState([]);
  const [legendData, setLegendData] = React.useState([]);
  const [option, setOption] = React.useState(DEFAULT_OPTIONS);

  // const router = useRouter();
  const updateSeries = (passXAxis) => {

      const newClonedOption = cloneDeep(DEFAULT_OPTIONS);
      const datasetWithFilters = [['ContributorNum','Repo','Date']];
      const legend = [];
      
      Object.entries(dataSource).forEach(([key,value]) => {
        legend.push(key);
        value.map(item=>{
          datasetWithFilters.push([item.contributorNum,item.repo,item.date,])
        })
      });

      const newDateSet =  datasetWithFilters.sort((a,b)=>new Date(a[2])-new Date(b[2]))

    const filterDataset = legend.map(item=>({
      id: item,
      fromDatasetId: 'dataset_raw',
      transform: {
          type: 'filter',
          config: {
              and: [
                  { dimension: 'Repo', '=': item }
              ]
          }
      }
    }));

    const series = legend.map(item=>({
      name:item,
      type: 'line',
      datasetId: item,
      showSymbol: false,
      encode: {
          x: 'Date',
          y: 'ContributorNum',
          itemName: 'Repo',
          tooltip: ['ContributorNum'],
      },
    }))

      newClonedOption.dataset = [
        {
          id: 'dataset_raw',
          source: newDateSet
        }
    ].concat(filterDataset);

    newClonedOption.series = series;
    newClonedOption.legend.data = legend;
      
    setOption(newClonedOption);
  };

  const getData = (repo) => {
      setLoading(true);
      if (!legendData.includes(repo)) {
          setLegendData(legendData.concat(repo));
      }

      fetch(`https://contributor-graph-api.apiseven.com/contributors?repo=${repo}`)
          .then(response => response.json())
          .then(myJson => {
              const { contributors = [] } = myJson;
              const data = contributors.map((item) => ({
                  repo,
                  contributorNum: item.idx,
                  date: item.date
              }));
              setLoading(false);

              const clonedDatasource = cloneDeep(dataSource);
              if (!clonedDatasource[repo]) {
                  setDataSource({ ...clonedDatasource, ...{ [repo]: data } });
              }
          });
  };

  React.useEffect(() => {
      switch (activeDate) {
          case "1month":
              setXAxis(getMonths(1));
              break;
          case "3months":
              setXAxis(getMonths(3));
              break;
          case "6months":
              setXAxis(getMonths(6));
              break;
          case "1year":
              setXAxis(getMonths(12));
              break;
          default:
              break;
      }
  }, [activeDate]);

  React.useEffect(() => {
      updateSeries(xAxis);
  }, [dataSource, xAxis]);

  React.useEffect(() => {
      // const { type, repo = "" } = router.query;
      // const repoArr = repo.split(",");
      // if (type === "contributor" && repo) {
      //     repoArr.map(item => {
      //         getData(item);
      //     });
      // }
  }, []);

  const [selectedType, setSelectedType] = React.useState("#contributor");
  const [repo, setRepo] = React.useState("apache/apisix");

  return (
    <>
    <div
        className="content"
        style={{
            display: "flex",
            width: "80%",
            marginLeft: "10%",
            flexDirection: "row",
            minHeight: "700px",
            justifyContent: "space-between",
        }}
    >
        <div className="left" style={{ marginTop: "200px" }}>
            <ListGroup defaultActiveKey={selectedType}>
                <ListGroup.Item
                    action
                    href="#contributor"
                    onClick={() => setSelectedType("#contributor")}
                >
                    Contributor Over Time
                </ListGroup.Item>
                <ListGroup.Item
                    action
                    href="#activity"
                    onClick={() => setSelectedType("#activity")}
                    disabled
                >
                    Activity Curve
                </ListGroup.Item>
            </ListGroup>
        </div>
        <div
            className="right"
            style={{ width: "80%", marginTop: "2%" }}
        >
            <div
                className="search-container"
                style={{ display: "flex", justifyContent: "center" }}
            >
                <InputGroup>
                    <FormControl
                        placeholder="apache/apisix"
                        aria-label="apache/apisix"
                        aria-describedby="apache/apisix"
                        value={repo}
                        onChange={e => {
                            setRepo(e.target.value);
                        }}
                    />
                    <InputGroup.Append>
                        <Button
                            variant="primary"
                            onClick={async () => {
                                await getData(repo);
                            }}
                        >
                            Add
                        </Button>
                        <>
                            <Button
                                variant="danger"
                                onClick={() => {
                                    setLegendData([""]);
                                    setOption(DEFAULT_OPTIONS);
                                    setDataSource({});
                                }}
                            >
                                clear
                            </Button>
                            {/* <CopyToClipboard
                                text={`${host}?type=contributor&repo=${legendData.join(',')}`} onCopy={(_, result) => { }}
                            >
                                <Button variant="success">share</Button>
                            </CopyToClipboard> */}
                        </>
                    </InputGroup.Append>
                </InputGroup>
            </div>
            <div id="chart" style={{ marginTop: "5%" }}>
                <div style={{ marginBottom: "10px" }}>
                    <Button
                        variant="outline-primary" value="1month" active={activeDate === '1month'} disabled onClick={(e) => {
                            setActiveDate(e.currentTarget.value);
                        }}
                    >
                        1 month
                    </Button>{" "}
                    <Button
                        variant="outline-primary" value="3months" active={activeDate === '3months'} disabled onClick={(e) => {
                            setActiveDate(e.currentTarget.value);
                        }}
                    >
                        3 months
                    </Button>{" "}
                    <Button
                        variant="outline-primary" disabled value="6months" active={activeDate === '6months'}
                        onClick={(e) => {
                            setActiveDate(e.currentTarget.value);
                        }}
                    >6 months
                    </Button>
                    {' '}
                    <Button
                        variant="outline-primary" value="1year" disabled active={activeDate === '1year'} onClick={(e) => {
                            setActiveDate(e.currentTarget.value);
                        }}
                    >
                        1 year
                    </Button>{" "}
                </div>
                <div>Time view range will be supported later</div>
                <ReactECharts
                    option={option}
                    style={{ height: 700 }}
                    showLoading={loading}
                    notMerge
                />
            </div>
        </div>
    </div>
</>
  );
}

export default App;
