import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { addToPaste, resetPaste, updateToPaste, removePaste } from '../redux/features/pasteSlice';
import { FaRedo, FaRegEdit } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';
import { MdDelete } from "react-icons/md";
import toast from 'react-hot-toast';
import { IoIosAdd } from "react-icons/io";
import { IoCopyOutline, IoEyeSharp } from "react-icons/io5";
import { CiShare1 } from "react-icons/ci";


export const Home = () => {
  const [inputTitle, setTitleText] = useState('');
  const [value, setValue] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const pasteId = searchParams.get('pasteId');
  const dispatch = useDispatch();
  const { pastes } = useSelector((state) => state.paste);

  const slicedArr = pastes.slice(0, 3);

  useEffect(() => {
    if (pasteId) {
      const pasteToEdit = pastes.find((p) => p.id === pasteId);
      if (pasteToEdit) {
        setTitleText(pasteToEdit.title);
        setValue(pasteToEdit.data);
        setSearchParams({ pasteId: pasteId });
      }
    }
  }, [pasteId, pastes, setSearchParams]);


  const copyFromHome = async (text) => {
    // small guard and user feedback
    if (!navigator?.clipboard) {
      toast.error('Clipboard not supported');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };
  const sharePaste = async (p) => {
    const Url = `${window.location.origin}/?pasteId=${p.id}`
    if (navigator.share) {
      try {
        await navigator.share(
          {
            title: p.title || 'shared paste',
            text: p.data,
            url: Url
          }
        );
        toast.success("shared successfully")
      }
      catch (error) {
        if (error.name !== 'AbortError') {
          await copyFromClipboard(Url);
          toast.success("link copied to clipboard successfully")
        }

      }
    } else {
      await copyFromClipboard(Url);
      toast.success('Link copied to clipboard');
    }
  }


  const reset = () => {
    dispatch(resetPaste());
    setTitleText('');
    setValue('');
    setSearchParams({});
  };

  const createNewPaste = () => {
    setTitleText('');
    setValue('');
    setSearchParams({});
  };

  const copyFromClipboard = async (text) => {
    if (!navigator?.clipboard) {
      toast.error('Clipboard not supported');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const createPaste = () => {
    const paste = {
      id: pasteId || uuidv4(),
      title: inputTitle,
      isPinned:false,
      data: value,
      createAt: new Date().toISOString(),
    };

    if (pasteId) {
      dispatch(updateToPaste(paste));
    } else {
      dispatch(addToPaste(paste));
    }

    setTitleText('');
    setValue('');
    setSearchParams({});
  };

  const editMode = (id) => {
    const pasteToEdit = pastes.find((p) => p.id === id);
    if (pasteToEdit) {
      setTitleText(pasteToEdit.title);
      setValue(pasteToEdit.data);
      setSearchParams({ pasteId: id });
    }
  };

  const deletePaste = (id) => {
    dispatch(removePaste(id));
  };

  return (
    <div className="p-4">

      <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
        <input
          className="p-2 rounded-2xl border w-full md:w-2/3"
          value={inputTitle}
          placeholder="Your title goes here..."
          onChange={(e) => setTitleText(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-2xl border bg-blue-500 text-white"
            onClick={createPaste}
          >
            {pasteId ? 'Update My Note' : 'Create My Note'}
          </button>
          <button
            onClick={createNewPaste}
            aria-label="New Note"
            className="p-2 rounded border"
          >
            <IoIosAdd />
          </button>
          <button
            onClick={reset}
            className="p-2 rounded border"
            aria-label="Reset"
          >
            <FaRedo />
          </button>
        </div>
      </div>


      <div className="mb-8 relative">
        <textarea
          className="w-full min-h-[300px] rounded-2xl border p-4 font-mono text-sm"
          rows={20}
          value={value}
          placeholder="Type here..."
          onChange={(e) => setValue(e.target.value)}
        />
        <button onClick={() => copyFromHome(value)} aria-label="Copy paste" className="text-gray-600 hover:text-gray-800 
        absolute top-5 right-5">
          <IoCopyOutline />
        </button>
      </div>

      <div>
        <h4 className="text-lg font-semibold mb-3">Recent Notes</h4>
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {slicedArr.length > 0 ? (
            slicedArr.map((p) => (
              <div key={p.id} className="flex justify-center">
                <div className="w-full max-w-xl border rounded-lg bg-white flex flex-col">

                  <div className="flex items-center justify-between px-4 py-3 border-b gap-5">
                    <h3 className="text-md font-medium truncate">{p.title || 'Untitled'}</h3>
                    <div className="flex items-center gap-2">
                      <button onClick={() => editMode(p.id)} aria-label="Edit" className="text-gray-600">
                        <FaRegEdit />
                      </button>
                      <NavLink to={`/Notes/Notes/?pasteId=${p.id}`} aria-label="View paste" className="text-gray-600 hover:text-gray-800">
                        <IoEyeSharp />
                      </NavLink>
                      <button onClick={() => copyFromClipboard(p.data)} aria-label="Copy" className="text-gray-600">
                        <IoCopyOutline />
                      </button>

                      <button
                        onClick={() => sharePaste(p)}
                        aria-label="Share"
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <CiShare1 />
                      </button>

                    </div>
                  </div>


                  <div className="px-4 py-3">
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-sm">{p.data}</pre>
                  </div>


                  <div className="px-4 py-2 border-t flex gap-2 justify-between ">
                    <div className="px-4 py-2  flex gap-2  ">
                      <span className="material-symbols-outlined">
                        calendar_clock
                      </span>
                      <span>
                        <small className="text-xs text-gray-500">	{new Date(p.createAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })
                        }</small>
                      </span>
                    </div>
                    <div className="px-4 py-2  flex gap-2  justify-evenly">
                      <button onClick={() => deletePaste(p.id)} aria-label="Delete paste" className="text-red-600 hover:text-red-800">
                        <MdDelete />
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-600">No Notes available</p>
          )}
        </div>

        {pastes.length > 3 && (
          <div className="mt-4 flex justify-center items-center">
            <NavLink to="/Notes" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              View All Notes
            </NavLink>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
