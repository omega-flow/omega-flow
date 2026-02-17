import { Outlet, Link as RouterLink } from "react-router-dom";
import { Box, Flex, HStack, Link } from "@chakra-ui/react";

export function Layout() {
  return (
    <Flex minH="100vh" direction="column">
      <Box as="header" bg="gray.800" color="white" px="6" py="3">
        <HStack gap="6">
          <Link asChild fontSize="lg" fontWeight="600" color="white" _hover={{ textDecoration: "none" }}>
            <RouterLink to="/">Omega Flow</RouterLink>
          </Link>
          <HStack as="nav" gap="4">
            <Link asChild color="gray.300" fontSize="sm" _hover={{ color: "white", textDecoration: "none" }}>
              <RouterLink to="/">Workflows</RouterLink>
            </Link>
            <Link asChild color="gray.300" fontSize="sm" _hover={{ color: "white", textDecoration: "none" }}>
              <RouterLink to="/debugger">Debugger</RouterLink>
            </Link>
          </HStack>
        </HStack>
      </Box>
      <Flex as="main" flex="1" direction="column">
        <Outlet />
      </Flex>
    </Flex>
  );
}
