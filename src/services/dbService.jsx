import { db } from "./firebase";
import dayjs from "dayjs";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  onSnapshot,
} from "firebase/firestore";

export const listenToDocument = (colName, id, callback) => {
  const docRef = doc(db, colName, id);
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
};

export const setDocument = async (colName, id, data) => {
  try {
    const docRef = doc(db, colName, id);
    await setDoc(
      docRef,
      {
        ...data,
        created_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        updated_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      },
      { merge: true },
    );
    return { success: true, id };
  } catch (error) {
    console.error(`Error in setDocument (${colName}):`, error);
    throw error;
  }
};

export const addDocument = async (colName, data) => {
  try {
    const colRef = collection(db, colName);
    const docRef = await addDoc(colRef, {
      ...data,
      created_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      updated_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error(`Error in addDocument (${colName}):`, error);
    throw error;
  }
};

export const getDocument = async (colName, id) => {
  try {
    const docRef = doc(db, colName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`Error in getDocument (${colName}):`, error);
    throw error;
  }
};

export const getCollection = async (colName, constraints = []) => {
  try {
    const colRef = collection(db, colName);
    const q = query(colRef, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error(`Error in getCollection (${colName}):`, error);
    throw error;
  }
};

export const updateDocument = async (colName, id, data) => {
  try {
    const docRef = doc(db, colName, id);
    await updateDoc(docRef, {
      ...data,
      updated_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    });
    return { success: true };
  } catch (error) {
    console.error(`Error in updateDocument (${colName}):`, error);
    throw error;
  }
};

export const deleteDocument = async (colName, id) => {
  try {
    const docRef = doc(db, colName, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error(`Error in deleteDocument (${colName}):`, error);
    throw error;
  }
};
