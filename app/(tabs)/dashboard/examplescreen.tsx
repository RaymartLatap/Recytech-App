import { Stack } from 'expo-router'
import React, { Component } from 'react'
import { Text, View } from 'react-native'

export class examplescreen extends Component {
  render() {
    return (
      <View>
        <Stack.Screen options={{ title: 'Example'}} />
        <Text> HELLOOOOOOOOOO </Text>
      </View>
    )
  }
}

export default examplescreen
