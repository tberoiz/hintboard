"use client";
import React from "react";
import { StepWrapper } from "@/domains/onboarding/components/step-wrapper";
import { Button } from "@hintboard/ui/component";
import Image from "next/image";
import { motion } from "framer-motion";

export default function Step1Welcome({
  onContinue,
  loading,
}: {
  onContinue?: () => void | Promise<void>;
  loading?: boolean;
}) {
  return (
    <StepWrapper>
      <motion.div
        className="flex flex-col items-center text-center"
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.08 } },
        }}
      >
        <motion.div
          className="mb-6 rounded-2xl shadow-sm overflow-hidden"
          variants={{
            hidden: { opacity: 0, y: 8 },
            show: { opacity: 1, y: 0 },
          }}
        >
          <Image src="/brand/synq-icon.png" alt="Synq" width={96} height={96} />
        </motion.div>
        <motion.h1
          className="text-3xl font-light tracking-tight"
          variants={{
            hidden: { opacity: 0, y: 8 },
            show: { opacity: 1, y: 0 },
          }}
        >
          Welcome to Synq Beta
        </motion.h1>
        <motion.p
          className="mt-3 max-w-xl text-muted-foreground"
          variants={{
            hidden: { opacity: 0, y: 8 },
            show: { opacity: 1, y: 0 },
          }}
        >
          You are early, and that&apos;s exciting! Start organizing your card
          shop inventory and help us shape the tools that will help your
          business grow.
        </motion.p>
        <motion.div
          className="mt-8"
          variants={{
            hidden: { opacity: 0, y: 8 },
            show: { opacity: 1, y: 0 },
          }}
        >
          <Button variant="outline" onClick={onContinue} disabled={loading}>
            {loading ? "Getting started..." : "Get started"}
          </Button>
        </motion.div>
      </motion.div>
    </StepWrapper>
  );
}
