"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import Papa from 'papaparse';
import _ from 'lodash';

interface StateData {
  state: string;
  dem_shift: number;
  gop_shift: number;
  total_shift: number;
  margin_shift: number;
  dem_pct_2020: number;
  dem_pct_2024: number;
  gop_pct_2020: number;
  gop_pct_2024: number;
}

interface ProcessedData {
  stateShifts: { [key: string]: StateData };
}

const ElectionShiftAnalysis = () => {
  const [data, setData] = useState<ProcessedData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [allStates, setAllStates] = useState<string[]>([]);

  useEffect(() => {
    const analyzeData = async () => {
      try {
        const data2020 = await fetch('/results-2020.csv').then(res => res.text());
        const data2024 = await fetch('/results-2024.csv').then(res => res.text());

        const results2020 = Papa.parse(data2020, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        }).data;

        const results2024 = Papa.parse(data2024, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        }).data;

        // Process state-level data
        const stateTotals2020 = _.chain(results2020)
          .groupBy('state_name')
          .mapValues(counties => ({
            dem_votes: _.sumBy(counties, 'votes_dem'),
            gop_votes: _.sumBy(counties, 'votes_gop'),
            total_votes: _.sumBy(counties, 'total_votes')
          }))
          .value();

        const stateTotals2024 = _.chain(results2024)
          .groupBy('state_name')
          .mapValues(counties => ({
            dem_votes: _.sumBy(counties, 'votes_dem'),
            gop_votes: _.sumBy(counties, 'votes_gop'),
            total_votes: _.sumBy(counties, 'total_votes')
          }))
          .value();

        // Get all unique state names
        const allStateNames = _.union(
          Object.keys(stateTotals2020),
          Object.keys(stateTotals2024)
        ).sort();

        // Calculate shifts for all states
        const stateShifts = allStateNames.map(state => {
          const data2020 = stateTotals2020[state] || {
            dem_votes: 0,
            gop_votes: 0,
            total_votes: 0
          };
          
          const data2024 = stateTotals2024[state] || {
            dem_votes: 0,
            gop_votes: 0,
            total_votes: 0
          };

          if (data2020.total_votes === 0 || data2024.total_votes === 0) {
            return null;
          }

          return {
            state,
            dem_shift: data2024.dem_votes - data2020.dem_votes,
            gop_shift: data2024.gop_votes - data2020.gop_votes,
            total_shift: data2024.total_votes - data2020.total_votes,
            margin_shift: (
              (data2024.dem_votes / data2024.total_votes) -
              (data2020.dem_votes / data2020.total_votes)
            ) * 100,
            dem_pct_2020: (data2020.dem_votes / data2020.total_votes) * 100,
            dem_pct_2024: (data2024.dem_votes / data2024.total_votes) * 100,
            gop_pct_2020: (data2020.gop_votes / data2020.total_votes) * 100,
            gop_pct_2024: (data2024.gop_votes / data2024.total_votes) * 100
          };
        }).filter(Boolean) as StateData[];

        setAllStates(allStateNames);
        setSelectedStates(allStateNames.slice(0, 10));
        setData({
          stateShifts: _.keyBy(stateShifts, 'state')
        });
        setLoading(false);
      } catch (error) {
        console.error('Error processing election data:', error);
        setLoading(false);
      }
    };

    analyzeData();
  }, []);

  if (loading) {
    return (
      <div className="p-4">
        <p>Loading election data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4">
        <p>Error loading election data</p>
      </div>
    );
  }

  const filteredData = selectedStates.map(state => data.stateShifts[state]);
  const chartHeight = Math.max(400, selectedStates.length * 40);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>State Analysis Controls</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Number of States to Show</label>
                <Select 
                  value={selectedStates.length.toString()}
                  onValueChange={(value) => {
                    setSelectedStates(allStates.slice(0, parseInt(value)));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select number of states" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 States</SelectItem>
                    <SelectItem value="10">10 States</SelectItem>
                    <SelectItem value="20">20 States</SelectItem>
                    <SelectItem value="30">30 States</SelectItem>
                    <SelectItem value="50">All States</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sort By</label>
                <Select
                  defaultValue="alphabet"
                  onValueChange={(value) => {
                    let sorted;
                    if (value === "alphabet") {
                      sorted = [...allStates].sort();
                    } else if (value === "margin") {
                      sorted = [...allStates].sort((a, b) => 
                        Math.abs(data.stateShifts[b].margin_shift) - Math.abs(data.stateShifts[a].margin_shift)
                      );
                    } else if (value === "dem_shift") {
                      sorted = [...allStates].sort((a, b) => 
                        Math.abs(data.stateShifts[b].dem_shift) - Math.abs(data.stateShifts[a].dem_shift)
                      );
                    } else if (value === "gop_shift") {
                      sorted = [...allStates].sort((a, b) => 
                        Math.abs(data.stateShifts[b].gop_shift) - Math.abs(data.stateShifts[a].gop_shift)
                      );
                    }
                    setSelectedStates(sorted!.slice(0, selectedStates.length));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort states by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alphabet">Alphabetical</SelectItem>
                    <SelectItem value="margin">Margin Shift</SelectItem>
                    <SelectItem value="dem_shift">Democratic Shift</SelectItem>
                    <SelectItem value="gop_shift">Republican Shift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>State Margin Shifts (2020-2024)</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: `${chartHeight}px`, minHeight: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number"
                  domain={[-15, 15]}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis 
                  type="category" 
                  dataKey="state" 
                  width={110}
                  fontSize={12}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Margin Shift']}
                  labelFormatter={(label) => `State: ${label}`}
                />
                <Legend />
                <Bar 
                  dataKey="margin_shift" 
                  fill="#8884d8" 
                  name="Margin Shift"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw Vote Changes by State</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: `${chartHeight}px`, minHeight: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number"
                  tickFormatter={(value) => (value / 1000).toFixed(0) + 'k'}
                />
                <YAxis 
                  type="category" 
                  dataKey="state" 
                  width={110}
                  fontSize={12}
                />
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString(), 'Votes']}
                  labelFormatter={(label) => `State: ${label}`}
                />
                <Legend />
                <Bar dataKey="dem_shift" fill="#2196F3" name="Democratic Vote Change" radius={[0, 4, 4, 0]} />
                <Bar dataKey="gop_shift" fill="#F44336" name="Republican Vote Change" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ElectionShiftAnalysis;