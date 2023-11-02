"use client"; // use client side because we want to use hooks

import { sidebarLinks } from "@/constants";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";
import { SignedOut } from "@clerk/nextjs";

const LeftSidebar = () => {
  const pathname = usePathname();
  return (
    // section is what create the container for the sidebar, do note that we dont use sheet from the shad/cn component as it needs to be triggered by a button to display the content, we want our sidebar content to always be displayed
    <section
      className="background-light900_dark200 light-border custom-scrollbar sticky left-0 top-0 flex h-screen
     flex-col justify-between overflow-y-auto border-r p-6 shadow-light-300 dark:shadow-none max-sm:hidden lg:w-[266px]"
    >
      <div className="flex flex-1 flex-col gap-6">
        {sidebarLinks.map((item) => {
          // checking the current path name or url
          const isActive =
            (pathname.includes(item.route) && item.route.length > 1) ||
            pathname === item.route; // item.route.length>1 means that if the route exists
          return (
            <Link
              key={item.route}
              href={item.route}
              className={`${
                isActive
                  ? "primary-gradient rounded-lg text-light-900"
                  : "text-dark300_light900"
              } flex items-center justify-start gap-4 bg-transparent p-4`}
            >
              <Image
                src={item.imgURL}
                alt={item.label}
                width={20}
                height={20}
                className={`${isActive ? "" : "invert-colors"}`}
              />
              <p
                className={`${
                  isActive ? "base-bold" : "base-medium"
                } max-lg:hidden`}
              >
                {item.label}
              </p>
            </Link>
          );
        })}
      </div>
      <SignedOut>
        <div className="flex flex-col gap-3">
          <Link href="/sign-in">
            <Button className="small-medium btn-secondary min-h-[41px] w-full rounded-lg px-4 py-3 shadow-none">
              <Image
                src="/assets/icons/account.svg"
                alt="login"
                width={20}
                height={20}
                className="invert-colors lg:hidden"
              />{" "}
              {/* lg:hidden means that the icon will be hidden on large devices,it will only show on small devices */}
              <span className="primary-text-gradient max-lg:hidden">
                Log In
              </span>
            </Button>
          </Link>

          <Link href="/sign-up">
            <Button className="small-medium light-border-2 btn-tertiary text-dark400_light900 min-h-[41px] w-full rounded-lg px-4 py-3 shadow-none">
              <Image
                src="/assets/icons/sign-up.svg"
                alt="lsign up"
                width={20}
                height={20}
                className="invert-colors lg:hidden"
              />
              <span className="max-lg:hidden">Sign Up</span>
            </Button>
          </Link>
        </div>
      </SignedOut>
    </section>
  );
};

export default LeftSidebar;
