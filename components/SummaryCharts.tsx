import React, { useState } from "react";
import { View, Text, Dimensions, Alert } from "react-native";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

const SummaryCharts: React.FC = () => {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);

  const data = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: [5, 8, 6, 10, 7, 9, 10],
        color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: [4, 6, 7, 8, 5, 6, 9],
        color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: [3, 5, 4, 6, 5, 7, 8],
        color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ["Paper", "Can", "PET Bottles"],
  };

  return (
    <View>
      <Text style={{ textAlign: "center", fontSize: 16, marginBottom: 10, marginTop: 30 }}>
        Trash Collection Summary
      </Text>
      {selectedValue && (
        <Text style={{ textAlign: "center", fontSize: 14, marginBottom: 10 }}>
          Selected Value: {selectedValue}
        </Text>
      )}
      <LineChart
        data={data}
        width={385} // Adjusted to use full screen width
        height={350}
        chartConfig={{
          backgroundGradientFrom: "#fff",
          backgroundGradientTo: "#fff",
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 8,
          },
          propsForDots: {
            r: "7",
            strokeWidth: "3",
            stroke: "#000",
          },
        }}
        bezier
        style={{ marginVertical: 8, borderRadius: 8 }}
        onDataPointClick={(data) => {
          setSelectedValue(`Value: ${data.value}, Index: ${data.index}`);
        }}
      />
    </View>
  );
};

export default SummaryCharts;


function rgba(arg0: number, arg1: number, arg2: number, $: any, arg4: { opacity: number; }) {
    throw new Error("Function not implemented.");
}
// Removed unused rgba function as it is not implemented and unnecessary.
