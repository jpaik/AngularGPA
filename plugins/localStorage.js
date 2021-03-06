import createPersistedState from "vuex-persistedstate";
import { checkOldLocalStorage, convertOldToNew } from "./lsMigration";

const LS_KEY = "gpaforme";

function getAuthenticatedUserData(store) {
  store.dispatch("schools/getAllSchools");
  store.dispatch("semesters/getAllSemesters");
  store.dispatch("classes/getAllClasses");
  return false;
}

function createDefaultSchool() {
  const defaultSchool = {
    id: "default",
    name: "school",
    scale: "plus",
    active: true,
  };
  return [defaultSchool];
}

function createDefaultClasses() {
  const defaultClass = {
    id: 0,
    credits: null,
    grade: 4,
    name: "",
    comments: "",
    semester: "default_0",
  };
  return [
    ...[0, 1, 2, 3, 4].map((id) => {
      return { ...defaultClass, id: "default_0_" + id };
    }),
    ...[0, 1, 2, 3, 4].map((id) => {
      return { ...defaultClass, id: "default_1_" + id, semester: "default_1" };
    }),
  ];
}
function createDefaultSemesters() {
  const defaultSemester = {
    id: 0,
    name: "",
    school: "default",
    active: false,
  };
  return [0, 1].map((id) => {
    return { ...defaultSemester, id: "default_" + id, active: id === 0 };
  });
}

/**
 * Creates default classes if they don't exist if schema is Local Storage.
 */
function checkOrCreateDefaultClasses(store, key) {
  const currentStore = JSON.parse(localStorage.getItem(key));
  const defaultSchools = createDefaultSchool();
  const defaultSemesters = createDefaultSemesters();
  const defaultClasses = createDefaultClasses();
  if (!currentStore) {
    return {
      schools: {
        schools: defaultSchools,
      },
      semesters: {
        semesters: defaultSemesters,
      },
      classes: {
        classes: defaultClasses,
      },
    };
  }
  if (
    currentStore.classes &&
    (!currentStore.classes.classes || !currentStore.classes.classes.length)
  ) {
    currentStore.classes.classes = defaultClasses;
  }
  if (
    currentStore.semesters &&
    (!currentStore.semesters.semesters ||
      !currentStore.semesters.semesters.length)
  ) {
    currentStore.semesters.semesters = defaultSemesters;
  }
  if (
    currentStore.schools.schools &&
    (!currentStore.schools.schools || !currentStore.schools.schools.length)
  ) {
    currentStore.schools.schools = defaultSchools;
  }
  return currentStore;
}

function checkPersistedFaunaStorage() {
  const ls = localStorage || window.localStorage;
  if (ls) {
    if (ls.getItem(LS_KEY) !== null) {
      const gpaforme = JSON.parse(ls.getItem(LS_KEY));
      if (gpaforme.schools && gpaforme.schools.schools) {
        const sc = gpaforme.schools.schools[0];
        // @ref doesn't exist in localStorage db
        if (sc && sc.owner && sc.owner["@ref"] !== undefined) {
          ls.removeItem(LS_KEY);
        }
      }
    }
  }
}

const requestIdleCallback =
  window.requestIdleCallback ||
  ((cb) => {
    let start = Date.now();
    return setTimeout(() => {
      let data = {
        didTimeout: false,
        timeRemaining() {
          return Math.max(0, 50 - (Date.now() - start));
        },
      };
      cb(data);
    }, 1);
  });

function saveToLocalStorage(key, state) {
  const ls = localStorage || window.localStorage;
  requestIdleCallback(() => {
    if (ls) {
      ls.setItem(key, JSON.stringify(state));
    }
  });
}

function localStorageEmpty() {
  const ls = localStorage || window.localStorage;
  if (ls.getItem(LS_KEY) !== null) {
    const gpaforme = JSON.parse(ls.getItem(LS_KEY));
    if (gpaforme.schools && gpaforme.schools.schools) {
      return !gpaforme.schools.schools.some((s) => s.id);
    }
    return true;
  }
  return true;
}

export default ({ store }) => {
  window.onNuxtReady(() => {
    // If localStorage key gpaforme hasn't been defined yet, check for migration
    if (localStorageEmpty()) {
      if (checkOldLocalStorage()) {
        convertOldToNew();
      }
    }
    if (!store.state.auth.loggedIn) {
      checkPersistedFaunaStorage();
    }

    createPersistedState({
      key: LS_KEY,
      paths: ["schools.schools", "semesters.semesters", "classes.classes"],
      getState: (key) =>
        store.state.auth.loggedIn
          ? getAuthenticatedUserData(store, key)
          : checkOrCreateDefaultClasses(store, key),
      setState: (key, state) => saveToLocalStorage(key, state),
    })(store);
  });
};
