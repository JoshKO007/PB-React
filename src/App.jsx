import { Button, Heading, Box } from '@chakra-ui/react'
import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <Box textAlign="center" mt="20">
      <Heading color="teal.500">¡Hola desde Chakra UI!</Heading>
      <Button mt={6} colorScheme="teal" onClick={() => setCount(count + 1)}>
        Clics: {count}
      </Button>
    </Box>
  )
}

export default App
