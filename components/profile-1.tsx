"use client";

import { motion } from "motion/react";
import { Share2, MoreVertical, BadgeCheck } from "lucide-react";

export default function Profile1() {
  return (
    <section className="w-full min-h-screen flex items-start lg:items-center py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-neutral-950">
      <div className="max-w-[1400px] mx-auto w-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          {/* Profile Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-4xl shadow-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 p-2">
            {/* Header Section with Background */}
            <div className="relative h-32 rounded-3xl sm:h-40 bg-linear-to-br from-red-400 via-red-300 to-red-200 dark:from-red-600 dark:via-red-500 dark:to-red-400">
              {/* Top Right Action Buttons */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors duration-200 shadow-md"
                  aria-label="Share profile"
                >
                  <Share2 className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors duration-200 shadow-md"
                  aria-label="More options"
                >
                  <MoreVertical className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Profile Picture - Overlaid 50% */}
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="relative"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white dark:bg-neutral-900 p-1.5">
                    <img
                      src="https://pbs.twimg.com/profile_images/1927474594102784000/Al0g-I6o_400x400.jpg"
                      alt="Profile picture"
                      className="w-full h-full rounded-full object-cover bg-neutral-100 dark:bg-neutral-800"
                    />
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="pt-16 pb-6 px-6 text-center">
              {/* Handle */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-sm text-neutral-500 dark:text-neutral-400 mb-2"
              >
                @davidhdev
              </motion.p>

              {/* Name with Verified Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex items-center justify-center gap-2 mb-3"
              >
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
                  David H.
                </h1>
                <BadgeCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.div>

              {/* Bio */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mb-4"
              >
                Web Developer, 8+ years of experience
              </motion.p>

              {/* Location and Join Date */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="flex items-center justify-center gap-2 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mb-6"
              >
                <span>SF, USA</span>
                <span className="text-neutral-400 dark:text-neutral-600">
                  •
                </span>
                <span>Joined April 2023</span>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3"
              >
                <button className="w-full sm:w-auto px-6 sm:px-8 py-2.5 rounded-md bg-linear-to-br from-red-600 via-red-500 to-red-400 dark:from-red-600 dark:via-red-500 dark:to-red-400 text-white font-medium text-sm hover:from-red-600 hover:to-red-600 dark:hover:from-red-700 dark:hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg">
                  Subscribe
                </button>
                <button className="w-full sm:w-auto px-6 sm:px-8 py-2.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 font-medium text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors duration-200">
                  Edit profile
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
