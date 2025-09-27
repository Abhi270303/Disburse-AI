"use client";
import { useEffect, useState } from "react";
import { getAuthState } from "@/lib/utils";
import Withdraw from "../withdraw";

const Home = () => {

  // If authenticated, show the withdraw component
  return <Withdraw />;
};

export default Home;
